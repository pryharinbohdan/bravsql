import * as base from './base.js';

// =====================================================
// APP CLASS - main application class
// =====================================================

class IndexApp {
    settings: base.IndexSettings;
    sqlQueryInput: base.SqlQueryInput;
    consoleOutput: base.ConsoleOutput;
    settingsMenu: base.SettingsMenu;
    safeModeModal: base.SafeModeModal;
    sqlWorker: base.SqlWorker;
    remoteSqlSender: base.RemoteSqlSender;
    copyTablePageMenu: base.CopyTablePageMenu;

    run_btn: HTMLElement;
    send_btn: HTMLElement;

    dbModeCaption: HTMLElement;
    safeModeCaption: HTMLElement;
    readOnlyModeCaption: HTMLElement;

    current_db_name: string;

    constructor() {
        // initialize settings
        this.settings = new base.IndexSettings();

        // initialize SQL input field
        this.sqlQueryInput = new base.SqlQueryInput(
            document.querySelector("#sqlite-query-input")!,
            document.querySelector("#sqlite-query-input-content")!,
            document.querySelector("#sqlite-query-input-backdrop")!,
            new base.AutoComplete(
                document.querySelector("#autocomplete-area")!,
                document.querySelector("#sqlite-query-input")!,
                document.querySelector("#complete-sql-query")!
            )
        );

        // initialize console
        this.consoleOutput = new base.ConsoleOutput(
            document.querySelector("#console-content")!
        );

        // initialize settings menu
        this.settingsMenu = new base.SettingsMenu(
            document.querySelector("#header-settings")!,
            document.querySelector("#settings-area")!,
            document.querySelector("#settings-area-close-btn")!
        );

        // initialize modal window
        this.safeModeModal = new base.SafeModeModal(
            document.querySelector("#confirm-safe-mode-alert")!,
            document.querySelector("#confirm-safe-mode-alert-ok-btn")!,
            document.querySelector("#confirm-safe-mode-alert-cancel-btn")!,
            document.querySelector("#confirm-safe-mode-alert-close-btn")!
        );


        // initialize worker
        this.sqlWorker = new base.SqlWorker(this.consoleOutput);

        // initialize query sender
        this.remoteSqlSender = new base.RemoteSqlSender(this.settings);

        // get buttons
        this.run_btn = document.querySelector("#run-sql-query")!;
        this.send_btn = document.querySelector("#send-sql-query")!;

        // get caption elements
        this.dbModeCaption = document.querySelector("#db-mode-caption")!;
        this.safeModeCaption = document.querySelector("#safe-mode-caption")!;
        this.readOnlyModeCaption = document.querySelector("#read-only-mode-caption")!;

        this.current_db_name = localStorage.getItem("current_db_name") ?? "bravsql-general.db";

        this.copyTablePageMenu = new base.CopyTablePageMenu(
            document.querySelector("#copy-table-page-elem")!,
            document.querySelector("#set-copy-table-page")!,
            document.querySelector("#copy-table-page-close-btn")!,
            document.querySelector("#remote-tables-names")!,
            document.querySelector("#table-select-copy-mode")!,
            document.querySelector("#input-remote-db-table-writes-count")!,
            document.querySelector("#input-remote-db-table-source-table-name")!,
            document.querySelector("#input-remote-db-table-local-db-path")!,
            document.querySelector('#copy-table-page-elem button.send-btn')!
        )

        this.copyTablePageMenu.element.style.display = 'none';

        this.setupEventListeners();
        this.initializeToggles();
    }

/// ADD COPY MODES FOR FIRST OR LAST N records

    clone() {
        const table_name = this.copyTablePageMenu.currentRemoteTableName();
        const clone_mode = this.copyTablePageMenu.currentCloneMode();
        const count = this.copyTablePageMenu.countN();
        const src_table_name = this.copyTablePageMenu.currentSrcTableName() ?? table_name;
        const local_db_path = this.copyTablePageMenu.currentLocalDBPath() ?? `bravsql-${localStorage.getItem("cf_db_id") ?? "general"}`;

        if (table_name === "") {
            alert("Please, set table for copying from list\n\nIf list is empty - check Remote DB Settings or/and try write test command in console and click SEND button for more information about problem in console.");
            return;
        }

        let query_to_remote = `SELECT * FROM ${table_name} `;

        switch (clone_mode) {
            case "first N": {
                   query_to_remote += `LIMIT ${count}` 
                }
                break;
            case "last N": {
                   query_to_remote += `ORDER BY rowid DESC LIMIT ${count}`  
                }
                break;
        }

        this.sendToRemoteString(query_to_remote).then((data: base.RemoteDbResponse) => {
            const writes = data.success ? data.result[0].results : [];
            let add_copied_data_query = "";
            writes.forEach(((write : object) => {
                add_copied_data_query += `INSERT INTO ${src_table_name} VALUES(${Object.values(write)
                                                                                .map(item => typeof item === 'string' ? `'${item}'` : item)
                                                                                .join(', ')}); `;
            }));

            //this.sqlWorker.sendDropCopyTable(src_table_name);

            this.sendToRemoteString(`SELECT * FROM sqlite_master WHERE name = '${table_name}'`)
                .then((data: base.RemoteDbResponse) => {
                    let create_tab_req = data.success ? data.result[0].results[0].sql : "";
                    create_tab_req = create_tab_req.replace(table_name, src_table_name);
                    add_copied_data_query = `${create_tab_req}; ${add_copied_data_query}`;

                    this.sqlWorker.sendCopyQuery(
                        add_copied_data_query, 
                        table_name,
                        local_db_path
                    )
                })
        })
    }

    // sets up event listeners
    setupEventListeners(): void {
        //document.querySelector("#set-copy-table-page")?.addEventListener("click", () => {
        this.copyTablePageMenu.caption_element.addEventListener("click", () => { 
            const element = this.copyTablePageMenu.element;
            if (element.classList.contains("inactive")) {
                element.style.display = "block";
                element.classList.remove("inactive");
                element.classList.add("active");
            }
            this.settingsMenu.close();
        });

        this.copyTablePageMenu.copy_btn
            .addEventListener('click', () => {
                this.clone();
                this.copyTablePageMenu.close();
            });

        this.copyTablePageMenu.close_btn.addEventListener("click", () => 
            this.copyTablePageMenu.close());


        // RUN button - executes query locally
        this.run_btn.addEventListener("click", () => this.handleRunClick());

        // SEND button - sends query to server
        this.send_btn.addEventListener("click", () => this.handleSendClick());

        // toggle switches
        if (this.settings.isGlobal_sett) {
            this.settings.isGlobal_sett.element?.addEventListener("click", () => {
                this.toggleDbMode();
            });
        }

        if (this.settings.safeMode_sett) {
            this.settings.safeMode_sett.element?.addEventListener("click", () => {
                this.toggleSafeMode();
            });
        }

        if (this.settings.readOnly_sett) {
            this.settings.readOnly_sett.element?.addEventListener("click", () => {
                this.toggleReadOnlyMode();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                event.preventDefault(); 
                if (this.sqlQueryInput.autocomplete.btn.classList.contains("active")) {
                    this.sqlQueryInput.autocomplete.complete();
                    this.sqlQueryInput.onInput();
                }            
                // add 4 spaces at cursor position
                else {
                    const start = this.sqlQueryInput.input.selectionStart;
                    const end = this.sqlQueryInput.input.selectionEnd;

                    const value = this.sqlQueryInput.input.value;
                    this.sqlQueryInput.input.value = value.substring(0, start) + "    " + value.substring(end);

                    // return cursor to the correct position, after inserted spaces
                    this.sqlQueryInput.input.selectionStart = this.sqlQueryInput.input.selectionEnd = start + 4;
                }
            } 
        });
    }

    // initializes toggle switches
    initializeToggles(): void {
        if (this.settings.isGlobal_sett) {
            this.setDbModeToggleView(this.settings.isGlobal_sett.getStorageValue());
        }

        if (this.settings.safeMode_sett) {
            this.setSafeModeToggleView(this.settings.safeMode_sett.getStorageValue());
        }

        if (this.settings.readOnly_sett) {
            this.setReadOnlyModeToggleView(this.settings.readOnly_sett.getStorageValue());
        }
    }

    // handles click on the RUN button
    handleRunClick(): void {
        const query = this.sqlQueryInput.getValue();

        const sql_request = this.sqlQueryInput.getValue().toUpperCase();
        const isDangerousQuery = sql_request.includes("DELETE") ||
            sql_request.includes("DROP") ||
            sql_request.includes("INSERT");

        if (isDangerousQuery) {
            if (this.settings.readOnly_sett && this.settings.readOnly_sett.getStorageValue()) {
                this.showBlockAccessAlert();
            } else if (this.settings.safeMode_sett && this.settings.safeMode_sett.getStorageValue()) {
                // Show warning about executing potentially dangerous command
                this.safeModeModal.show(() => this.sqlWorker.sendQuery(query, this.sqlWorker.databases_select?.value));
            } else {
                this.sqlWorker.sendQuery(query, this.sqlWorker.databases_select?.value);
            }
        } else {
            this.sqlWorker.sendQuery(query, this.sqlWorker.databases_select?.value);
        }
        this.sqlQueryInput.autocomplete.saveCommand(query);
    }

    // handles click on the SEND button
    handleSendClick(): void {
        if (!this.settings.isGlobal_sett || !this.settings.isGlobal_sett.getStorageValue()) {
            alert('Change your DB mode to "Global" for this action');
            return;
        }

        const query = this.sqlQueryInput.getValue();
        const sql_request = query.toUpperCase();
        const isDangerousQuery = sql_request.includes("DELETE") ||
            sql_request.includes("CREATE") ||
            sql_request.includes("DROP") ||
            sql_request.includes("INSERT");
        
        const isChangeDbStruct = sql_request.includes("DROP") || 
                                sql_request.includes("CREATE");

        if (isDangerousQuery) {
            if (this.settings.readOnly_sett && this.settings.readOnly_sett.getStorageValue()) {
                this.showBlockAccessAlert();
            } else if (this.settings.safeMode_sett && this.settings.safeMode_sett.getStorageValue()) {
                // Show warning about executing potentially dangerous command
                this.safeModeModal.show(() => {
                    this.sendToRemote().then(() => {
                        setTimeout(() => {
                            if (isChangeDbStruct) this.remoteSqlSender.updateRemoteTablesList();
                        }, 300)
                    });
                });
            } else {
                this.sendToRemote().then(() => {
                    setTimeout(() => {
                        if (isChangeDbStruct) this.remoteSqlSender.updateRemoteTablesList();
                    }, 300)
                });
            }
        } else {
            this.sendToRemote().then(() => {
                setTimeout(() => {
                    if (isChangeDbStruct) this.remoteSqlSender.updateRemoteTablesList();
                }, 300)
            });
        }
        this.sqlQueryInput.autocomplete.saveCommand(query);
    }

    // sends query to the remote server
    async sendToRemote(): Promise<void> {
        const query = this.sqlQueryInput.getValue();
        this.consoleOutput.showLoadingBar();
        const response = await this.remoteSqlSender.sendQuery(query);
        this.consoleOutput.hideLoadingBar();

        if (response.success) {
            // show result
            this.consoleOutput.print(new base.ConsoleTableMessage(
                [], 
                new base.Table(response.result[0].results),
                true
            ))
        } else {
            if (response.errors && response.errors[0].message === "empty_basic_db_link") {
                alert("You not set remote DB data!\n\nPlease click on Settings icon and pick 'Cloudflare' option for setting.");
            } else if (response.errors) {
                this.consoleOutput.print(new base.ConsoleTextMessage(
                    ["error-text"],
                    response.errors![0].message,
                    true
                ))
            }
        }
    }

    async sendToRemoteString(query : string) : Promise<base.RemoteDbResponse> {
        return await this.remoteSqlSender.sendQuery(query);
    }

    // shows access blocked warning
    showBlockAccessAlert(): void {
        alert("Your view mode is read only.\nChange them for send this command to remote SQLite server!");
    }

    // toggles DB mode
    toggleDbMode(): void {
        if (this.settings.isGlobal_sett) {
            this.setDbModeToggleView(!this.settings.isGlobal_sett.getStorageValue());
        }
    }

    // sets the view of DB mode toggle
    setDbModeToggleView(targetState: boolean): void {
        if (this.settings.isGlobal_sett) {
            this.settings.isGlobal_sett.setToggleState(targetState);

            if (targetState) {
                this.send_btn.classList.add("active");
            } else {
                this.send_btn.classList.remove("active");
            }

            this.dbModeCaption.innerHTML = targetState ? "Global" : "Local";
        }
    }

    // toggles safe mode
    toggleSafeMode(): void {
        if (this.settings.safeMode_sett) {
            this.setSafeModeToggleView(!this.settings.safeMode_sett.getStorageValue());
        }
    }

    // sets the view of safe mode toggle
    setSafeModeToggleView(targetState: boolean): void {
        if (this.settings.safeMode_sett) {
            this.settings.safeMode_sett.setToggleState(targetState);
            this.safeModeCaption.innerHTML = targetState ? "En" : "Dis";
        }
    }

    // toggles read only mode
    toggleReadOnlyMode(): void {
        if (this.settings.readOnly_sett) {
            this.setReadOnlyModeToggleView(!this.settings.readOnly_sett.getStorageValue());
        }
    }

    // sets the view of read only mode toggle
    setReadOnlyModeToggleView(targetState: boolean): void {
        if (this.settings.readOnly_sett) {
            this.settings.readOnly_sett.setToggleState(targetState);
            this.readOnlyModeCaption.innerHTML = targetState ? "En" : "Dis";
        }
    }
}

// =====================================================
// APP START
// =====================================================

const index_app = new IndexApp();