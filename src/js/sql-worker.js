"use strict";
class SqlWorkerInside {
    db_name;
    DEF_DB_NAME = "bravsql-general.db";
    sqlite3;
    databases = new Map();
    currentDbName = this.DEF_DB_NAME;
    constructor() {
        console.log('SQL Worker started.');
        this.db_name = this.DEF_DB_NAME;
        this.setupEventListeners();
        this.initSQLite().then(() => {
            postMessage({ type: 'ready' });
        }).catch((e) => {
            this.error('Failed to initialize SQLite:', e.message);
        });
    }
    async initSQLite() {
        this.log('Loading and initializing sqlite3 module...');
        let sqlite3Js = 'sqlite3.js';
        const urlParams = new URL(self.location.href).searchParams;
        if (urlParams.has('sqlite3.dir')) {
            sqlite3Js = urlParams.get('sqlite3.dir') + '/' + sqlite3Js;
        }
        importScripts(sqlite3Js);
        this.sqlite3 = await self.sqlite3InitModule({
            print: (...args) => this.log(...args),
            printErr: (...args) => this.error(...args),
        });
        const capi = this.sqlite3.capi;
        const oo = this.sqlite3.oo1;
        this.log('sqlite3 version', capi.sqlite3_libversion(), capi.sqlite3_sourceid());
        await this.createDatabase(this.db_name);
        this.log('Database ready:', this.db_name);
    }
    async createDatabase(dbName) {
        if (this.databases.has(dbName)) {
            this.log('Database already exists:', dbName);
            return this.databases.get(dbName);
        }
        let db;
        if (this.sqlite3.opfs) {
            db = new this.sqlite3.opfs.OpfsDb(`/${dbName}`);
            this.log('Created OPFS database:', dbName);
        }
        else {
            db = new this.sqlite3.oo1.DB(`/${dbName}`, 'ct');
            this.log('Created in-memory database:', dbName);
        }
        this.databases.set(dbName, db);
        return db;
    }
    // switch current active DB
    switchDatabase(dbName) {
        if (!this.databases.has(dbName)) {
            throw new Error(`Database ${dbName} does not exist. Create it first.`);
        }
        this.currentDbName = dbName;
        this.log('Switched to database:', dbName);
        return this.databases.get(dbName);
    }
    ;
    getCurrentDb() {
        const db = this.databases.get(this.currentDbName);
        if (!db) {
            throw new Error("No database is currently active, try waiting or reloading the page. If that doesn't work, make sure you only have one tab of this web page open in your browser.");
        }
        return db;
    }
    ;
    setupEventListeners() {
        self.addEventListener('message', (event) => {
            const { type, payload } = event.data;
            if (!this.sqlite3) {
                this.error('SQLite not initialized yet.');
                postMessage({
                    type: 'error',
                    payload: { message: 'SQLite not initialized' },
                });
                return;
            }
            try {
                switch (type) {
                    case 'query': {
                        const sqlQuery = payload.sql_query;
                        const targetDb = payload.db_name || this.currentDbName;
                        // switch to DB if set
                        if (payload.db_name && payload.db_name !== this.currentDbName) {
                            if (!this.databases.has(payload.db_name)) {
                                this.createDatabase(payload.db_name);
                            }
                            this.switchDatabase(payload.db_name);
                        }
                        const db = this.getCurrentDb();
                        this.log('Executing query on', this.currentDbName, ':', sqlQuery);
                        let results = [];
                        db.exec({
                            sql: sqlQuery,
                            rowMode: 'object',
                            callback: function (raw) {
                                results.push(raw);
                            },
                        });
                        this.log('Query executed successfully. Rows:', results.length);
                        postMessage({
                            type: 'result',
                            payload: {
                                results,
                                db_name: this.currentDbName
                            },
                        });
                        break;
                    }
                    case 'copy_query': {
                        const sqlQuery = payload.sql_query;
                        const targetDb = payload.db_name || this.currentDbName;
                        // switch to DB if set
                        if (payload.db_name && payload.db_name !== this.currentDbName) {
                            if (!this.databases.has(payload.db_name)) {
                                this.createDatabase(payload.db_name);
                            }
                            this.switchDatabase(payload.db_name);
                        }
                        const db = this.getCurrentDb();
                        this.log('Executing query on', this.currentDbName, ':', sqlQuery);
                        let results = [];
                        db.exec({
                            sql: sqlQuery,
                            rowMode: 'object',
                            callback: function (raw) {
                                results.push(raw);
                            },
                        });
                        this.log('Query executed successfully. Rows:', results.length);
                        postMessage({
                            type: 'copy_result',
                            payload: {
                                results,
                                table_name: payload.table_name,
                                db_name: this.currentDbName
                            },
                        });
                        break;
                    }
                    case 'create_db': {
                        const dbName = payload.db_name;
                        if (!dbName) {
                            throw new Error('db_name is required');
                        }
                        this.createDatabase(dbName);
                        this.log('Database created:', dbName);
                        postMessage({
                            type: 'db_created',
                            payload: { db_name: dbName },
                        });
                        break;
                    }
                    case 'switch_db': {
                        const dbName = payload.db_name;
                        if (!dbName) {
                            throw new Error('db_name is required');
                        }
                        this.switchDatabase(dbName);
                        postMessage({
                            type: 'db_switched',
                            payload: { db_name: dbName },
                        });
                        break;
                    }
                    case 'list_databases': {
                        const dbList = Array.from(this.databases.keys());
                        postMessage({
                            type: 'database_list',
                            payload: {
                                databases: dbList,
                                current: this.currentDbName
                            },
                        });
                        break;
                    }
                    default: {
                        this.warn('Unknown message type:', type);
                        break;
                    }
                }
            }
            catch (e) {
                this.error('Error executing command:', e.message);
                postMessage({
                    type: 'error',
                    payload: { message: e.message },
                });
            }
        });
    }
    logHtml(cssClass, ...args) {
        postMessage({
            type: 'log',
            payload: { cssClass, args },
        });
    }
    log(...args) {
        this.logHtml('', ...args);
    }
    warn(...args) {
        this.logHtml('warning', ...args);
    }
    error(...args) {
        this.logHtml('error', ...args);
    }
}
const sql_worker = new SqlWorkerInside();
