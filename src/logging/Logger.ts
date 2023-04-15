/* ==== CONST ======================================================================= */
const RESET_COLOR = "\x1b[0m";

const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARN = 2;
const LOG_LEVEL_ERROR = 3;

const logLevel = getLogLevel();

function getLogLevel() {
    if(process.env.LOG_LEVEL == "DEBUG") return LOG_LEVEL_DEBUG;
    if(process.env.LOG_LEVEL == "WARN") return LOG_LEVEL_WARN;
    if(process.env.LOG_LEVEL == "ERROR") return LOG_LEVEL_ERROR;
    return LOG_LEVEL_INFO;
}

/* ==== EXPORTS ===================================================================== */
export default class ClassLogger {
    private className: string;
    constructor(className: string, dirname?: string) {
        this.className = dirname
        ? (dirname.split("/stranger-bot/", 2)[1].replace(/\//g, '.').replace(/\.[tj]?s/, '') + ( className ? ('.'+className) : "" ))
        : className;
    }

    private a = (): string => `[\x1b[1m${this.className}${RESET_COLOR}] `;
    public debug =  (text: string): void => ClassLogger.debug(this.a() + text);
    public info =   (text: string): void => ClassLogger.info(this.a() + text);
    public warn =   (text: string): void => ClassLogger.warn(this.a() + text);
    public error =  (text: string): void => ClassLogger.error(this.a() + text);


    public static debug = (text: string): void => { if(logLevel <= LOG_LEVEL_DEBUG) ClassLogger.print("DEBUG", "\x1b[35m", text) };
    public static info = (text: string): void => { if(logLevel <= LOG_LEVEL_INFO) ClassLogger.print("INFO", "\x1b[36m", text) };
    public static warn = (text: string): void => { if(logLevel <= LOG_LEVEL_WARN) ClassLogger.print("WARN", "\x1b[33m", text) };
    public static error = (text: string): void => ClassLogger.print("ERROR", "\x1b[31m", text);
    
    private static print = (level: string, color: string, text: string): void =>
        console.log(`[${color}${level}${RESET_COLOR}] \x1b[1m\x1b[90m${new Date().toLocaleTimeString("en-GB")}${RESET_COLOR} ${text}`);
}