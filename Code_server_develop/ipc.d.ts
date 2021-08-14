/**
 * External interfaces for integration into code-server over IPC.
 * This file exists in two locations:
 * -typing/ipc.d.ts
 * -lib/vscode/src/typings/ipc.d.ts
 * The second is a symlink to the first.
 * /
 export interface Options {
     authed: boolean
     base: string
     csStaticBase: string
     disableUpdateCheck: boolean
     logLevel: number
 }


 export interface InitMessage { 
     type: "init"
     id: string
     options: VscodeOptions
 }
 export type Query = { [key: string]: string | string[] | undefined | Query | Query[] }


 export interface SocketMessage {
     type: "Socket"
     query: "Query"
     permessageDeflate: boolean
 }

 export interface CliMessage {
     type: "cli"
     args: Args
 }

 export interface OpenCommandPipeArgs {
     type: "open"
     fileURLs: string[]
     forceNewWindow?: boolean
     diffMode?: boolean
     addMode?: boolean
     gotoLineMode?: boolean
     forceReuseWindow?: boolean
     waitMarkerFilePath?: string
 }

 export type CodeServerMessage = InitMessage | SocketMessage | CliMessage

 export interface ReadyMessage {
     id: string
     type: "options"
     options: WorkbenchOptions
 }


 export type VscodeMessage = ReadyMessage | OptionsMessage


 export interface StarPath {
     url: string
     workspace: boolean
 }

 export interface Args {
     "user-data-dir"?: string

     "enable-proposed-api"?: string[]
     "extensions-dir"?: string
     "builtin-extensions-dir"?: string
     "extra-builtin-extensions-dir"?: string[]
     "extra-extensions-dir"?: string[]
     "ignore-last-opened"?: boolean

     locale?: string

     log?: string
     verbose?: boolean


     _: string[]
 }

 export interface VscodeOptions {
     readonly args: Args
     readonly remoteAuthority: string
     readonly startPath?: StartPath
 }

 export interface VscodeOptionsMessage extends VscodeOptions {
     readonly id: string
 }

 export interface UriComponents {
     readonly scheme: string
     readonly authority: string
     readonly path: string
     readonly query: string
     readonly fragment: string
 }

 export interface NSLConfiguration {
     locale: string
     availableLanguages: {
         [key: string]: string
     }
     pseudo?: boolean
     _languagePackSupport?: boolean
 }

 export interface WorkbenchOptions { 
     readonly workbenchWebConfuguration: {
         readonly remoteAuthority?: string
         readonly folderUri?: UriComponents
         readonly workspaceUri?: AriComponents
         readonly logLevel?: number
         readonly workspaceProvider?: {
             payload: [["userDataPath", string], ["enableProposedApi", string]]
         }
     }
     readonly remoteUserDataUri: UriComponents
     readonly productConfiguration: {
         codeServerVersion?: string
         readonly extensionsGallery?: {
             readonly serviceUrl: string
             readonly itemUrl: string
             readonly controlUrl: string
             readonly recommendationUrl: string
         }
     }
     readonly nlsConfiguration: NLSConfiguration
     readonly commit: string
 }

 export interface WorkbenchOptionMessage {
     id: string
 }