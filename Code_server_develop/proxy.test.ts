import bodyParser from "body-parser"
import * as express from "express"
import * as nodeFetch from "node-fetch"
import * as http from "http"
import { HttpCode } from "../../../src/common/http"
import { proxy } from "../../../src/node/proxy"
import * as httpserver from "../../utils/httpserver"
import * as integration from "../../utils/integration"
import { getAvailablePort } from "../../utils/helpers"

describe("proxy", () => {
  const nhooyrDevServer = new httpserver.HttpServer()
  let codeServer: httpserver.HttpServer | undefined
  let proxyPath: string
  let absProxyPath: string
  let e: express.Express

  beforeAll(async () => {
    await nhooyrDevServer.listen((req, res) => {
      e(req, res)
    })
    proxyPath = `/proxy/${nhooyrDevServer.port()}/wsup`
    absProxyPath = proxyPath.replace("/proxy/", "/absproxy/")
  })

  afterAll(async () => {
    await nhooyrDevServer.close()
  })

  beforeEach(() => {
    e = express.default()
  })

  afterEach(async () => {
    if (codeServer) {
      await codeServer.close()
      codeServer = undefined
    }
  })

  it("should rewrite the base path", async () => {
    e.get("/wsup", (req, res) => {
      res.json("asher is the best")
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(proxyPath)
    expect(resp.status).toBe(200)
    const json = await resp.json()
    expect(json).toBe("asher is the best")
  })

  it("should not rewrite the base path", async () => {
    e.get(absProxyPath, (req, res) => {
      res.json("joe is the best")
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(absProxyPath)
    expect(resp.status).toBe(200)
    const json = await resp.json()
    expect(json).toBe("joe is the best")
  })

  it("should rewrite redirects", async () => {
    e.post("/wsup", (req, res) => {
      res.redirect(307, "/finale")
    })
    e.post("/finale", (req, res) => {
      res.json("redirect success")
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(proxyPath, {
      method: "POST",
    })
    expect(resp.status).toBe(200)
    expect(await resp.json()).toBe("redirect success")
  })

  it("should not rewrite redirects", async () => {
    const finalePath = absProxyPath.replace("/wsup", "/finale")
    e.post(absProxyPath, (req, res) => {
      res.redirect(307, finalePath)
    })
    e.post(finalePath, (req, res) => {
      res.json("redirect success")
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(absProxyPath, {
      method: "POST",
    })
    expect(resp.status).toBe(200)
    expect(await resp.json()).toBe("redirect success")
  })

  it("should allow post bodies", async () => {
    e.use(bodyParser.json({ strict: false }))
    e.post("/wsup", (req, res) => {
      res.json(req.body)
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(proxyPath, {
      method: "post",
      body: JSON.stringify("coder is the best"),
      headers: {
        "Content-Type": "application/json",
      },
    })
    expect(resp.status).toBe(200)
    expect(await resp.json()).toBe("coder is the best")
  })

  it("should handle bad requests", async () => {
    e.use(bodyParser.json({ strict: false }))
    e.post("/wsup", (req, res) => {
      res.json(req.body)
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(proxyPath, {
      method: "post",
      body: "coder is the best",
      headers: {
        "Content-Type": "application/json",
      },
    })
    expect(resp.status).toBe(400)
    expect(resp.statusText).toMatch("Bad Request")
  })

  it("should handle invalid routes", async () => {
    e.post("/wsup", (req, res) => {
      res.json(req.body)
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(`${proxyPath}/hello`)
    expect(resp.status).toBe(404)
    expect(resp.statusText).toMatch("Not Found")
  })

  it("should handle errors", async () => {
    e.use(bodyParser.json({ strict: false }))
    e.post("/wsup", (req, res) => {
      throw new Error("BROKEN")
    })
    codeServer = await integration.setup(["--auth=none"], "")
    const resp = await codeServer.fetch(proxyPath, {
      method: "post",
      body: JSON.stringify("coder is the best"),
      headers: {
        "Content-Type": "application/json",
      },
    })
    expect(resp.status).toBe(500)
    expect(resp.statusText).toMatch("Internal Server Error")
  })
})

// NOTE@jsjoeio
// Both this test suite and the one above it are very similar
// The main difference is this one uses http and node-fetch
// and specifically tests the proxy in isolation vs. using
// the httpserver abstraction we've built.
//
// Leaving this as a separate test suite for now because
// we may consider refactoring the httpserver abstraction
// in the future.
//
// If you're writing a test specifically for code in
// src/node/proxy.ts, you should probably add it to
// this test suite.
describe("proxy (standalone)", () => {
  let URL = ""
  let PROXY_URL = ""
  let testServer: http.Server
  let proxyTarget: http.Server

  beforeEach(async () => {
    const PORT = await getAvailablePort()
    const PROXY_PORT = await getAvailablePort()
    URL = `http://localhost:${PORT}`
    PROXY_URL = `http://localhost:${PROXY_PORT}`
    // Define server and a proxy server
    testServer = http.createServer((req, res) => {
      proxy.web(req, res, {
        target: PROXY_URL,
      })
    })

    proxyTarget = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" })
      res.end()
    })

    // Start both servers
    await proxyTarget.listen(PROXY_PORT)
    await testServer.listen(PORT)
  })

  afterEach(async () => {
    await testServer.close()
    await proxyTarget.close()
  })

  it("should return a 500 when proxy target errors ", async () => {
    // Close the proxy target so that proxy errors
    await proxyTarget.close()
    const errorResp = await nodeFetch.default(`${URL}/error`)
    expect(errorResp.status).toBe(HttpCode.ServerError)
    expect(errorResp.statusText).toBe("Internal Server Error")
  })

  it("should proxy correctly", async () => {
    const resp = await nodeFetch.default(`${URL}/route`)
    expect(resp.status).toBe(200)
    expect(resp.statusText).toBe("OK")
  })
})
