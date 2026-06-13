// =====================================================
// ТИПИ ТА ІНТЕРФЕЙСИ
// =====================================================
export class AutoComplete {
    STORAGE_KEY;
    MAX_HISTORY;
    element;
    input_element;
    btn;
    currentSuggestion = "";
    commandHistory = [];
    constructor(element, input_element, btn, STORAGE_KEY = 'command_history', MAX_HISTORY = 100) {
        this.btn = btn;
        this.input_element = input_element;
        this.element = element;
        this.STORAGE_KEY = STORAGE_KEY;
        this.MAX_HISTORY = MAX_HISTORY;
        this.loadHistory();
    }
    loadHistory() {
        const storage_value = localStorage.getItem(this.STORAGE_KEY);
        if (storage_value) {
            this.commandHistory = JSON.parse(storage_value);
        }
        this.normalize();
    }
    saveCommand(command) {
        const trimmed = command.trim();
        if (!trimmed)
            return;
        // видаляємо дублікат, якщо він існує, та додаємо на початок
        this.commandHistory = [trimmed, ...this.commandHistory.filter(c => c !== trimmed)];
        // обмежуємо до 100
        this.normalize();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.commandHistory));
    }
    getSuggestions(input, limit = 5) {
        if (!input.trim())
            return this.commandHistory.slice(0, limit);
        const lower = input.toLowerCase();
        // початок рядка 
        const startsWith = this.commandHistory.filter(c => c.toLowerCase().startsWith(lower));
        return [...startsWith].slice(0, limit);
    }
    update() {
        const suggestions = this.getSuggestions(this.input_element.value);
        if (suggestions.length && suggestions[0] !== this.input_element.value) {
            this.btn.classList.remove('inactive');
            this.btn.classList.add('active');
            this.currentSuggestion = suggestions[0];
        }
        else {
            this.btn.classList.remove('active');
            this.btn.classList.add('inactive');
            this.currentSuggestion = "";
        }
        const inputVal = this.input_element.value;
        const suffix = this.currentSuggestion.slice(inputVal.length);
        this.element.textContent = "";
        const hidden = document.createElement('span');
        hidden.textContent = inputVal;
        this.element.appendChild(hidden);
        this.element.appendChild(document.createTextNode(suffix));
    }
    complete() {
        if (this.btn.classList.contains("active")) {
            this.input_element.value = this.currentSuggestion;
            this.element.textContent = "";
            this.btn.classList.remove("active");
            this.btn.classList.add("inactive");
        }
    }
    normalize() {
        if (this.commandHistory.length > this.MAX_HISTORY) {
            this.commandHistory = this.commandHistory.slice(0, this.MAX_HISTORY);
        }
    }
}
// =====================================================
// КЛАС TABLE - для відображення таблиць даних
// =====================================================
export class Table {
    data;
    constructor(data) {
        this.data = data;
    }
    // генерує HTML-код таблиці
    html(isGlobal) {
        const class_name = isGlobal ? "global-table" : "local-table";
        if (!this.data || this.data.length === 0) {
            return `<p class="console-text">Запит виконано успішно. Немає даних для повернення.</p>`;
        }
        const head = `<tr>${Object.keys(this.data[0]).map(key => `<th>${key}</th>`).join('')}</tr>`;
        const content_rows = this.data.map(row => `<tr>${Object.values(row).map(element => `<td>${element}</td>`).join('')}</tr>`);
        return `<table class="${class_name}">\n  ${head}\n  ${content_rows.join('\n')}\n</table>`;
    }
}
// базовий клас для всіх повідомлень консолі
export class BaseConsoleMessage {
    element;
    className;
    isGlobal;
    content = "";
    caption = "";
    constructor(className, isGlobal) {
        this.element = document.createElement('div');
        this.className = className;
        this.isGlobal = isGlobal;
    }
    // створює підпис з часом та типом БД
    init() {
        this.caption = `<p>${this.isGlobal ? 'Віддалена БД' : 'Локальна БД'} | ${(new Date).toTimeString().split(" ")[0]}</p>`;
        this.element.innerHTML = `${this.content}\n${this.caption}`;
    }
}
// текстове повідомлення в консолі
export class ConsoleTextMessage extends BaseConsoleMessage {
    text;
    constructor(className, text, isGlobal) {
        super(className, isGlobal);
        this.text = text;
        this.init();
    }
    setText(text) {
        this.text = text;
    }
    init() {
        this.content = `<p class="${this.className.join(" ")}">${this.text}</p>`;
        super.init();
    }
}
// повідомлення з таблицею в консолі
export class ConsoleTableMessage extends BaseConsoleMessage {
    table;
    constructor(className, table, isGlobal) {
        super(className, isGlobal);
        this.table = table;
        this.init();
    }
    setTable(table) {
        this.table = table;
    }
    init() {
        this.content = this.table.html(this.isGlobal);
        super.init();
    }
}
// =====================================================
// КЛАС CONSOLEOUTPUT - керує виведенням у консоль
// =====================================================
export class ConsoleOutput {
    element;
    loadingBar = null;
    constructor(element) {
        this.element = element;
    }
    // додає повідомлення в консоль
    print(message) {
        this.element.appendChild(message.element);
        this.scrollToBottom();
    }
    showLoadingBar() {
        if (!this.loadingBar) {
            this.loadingBar = document.querySelector("#loading-bar-wrapper");
        }
        this.loadingBar.classList.remove('inactive');
        this.loadingBar.classList.add('active');
        this.scrollToBottom();
    }
    hideLoadingBar() {
        if (this.loadingBar) {
            this.loadingBar.classList.remove('active');
            this.loadingBar.classList.add('inactive');
        }
    }
    // прокручує консоль донизу
    scrollToBottom() {
        this.element.scrollTo({
            top: this.element.scrollHeight,
            left: -this.element.scrollWidth,
            behavior: 'smooth'
        });
    }
}
// =====================================================
// КЛАСИ ДЛЯ НАЛАШТУВАНЬ
// =====================================================
// базовий клас для елементів налаштувань
export class SettingsElement {
    local_storage_var_name;
    constructor(local_storage_var_name) {
        this.local_storage_var_name = local_storage_var_name;
    }
}
// клас для перемикачів (тумблерів)
export class Thumb extends SettingsElement {
    element;
    active_class_name = "active";
    inactive_class_name = "inactive";
    constructor(value, element, local_storage_var_name) {
        super(local_storage_var_name);
        if (!localStorage.getItem(this.local_storage_var_name)) {
            this.setToggleState(value);
        }
        this.element = element;
    }
    // встановлює стан перемикача
    setToggleState(targetIsActive) {
        if (this.element) {
            if (targetIsActive) {
                this.element.classList.remove(this.inactive_class_name);
                this.element.classList.add(this.active_class_name);
                this.element.firstElementChild?.classList.add(this.active_class_name);
            }
            else {
                this.element.classList.remove(this.active_class_name);
                this.element.classList.add(this.inactive_class_name);
                this.element.firstElementChild?.classList.remove(this.active_class_name);
            }
        }
        localStorage.setItem(this.local_storage_var_name, `${targetIsActive}`);
    }
    // завантажує значення з localStorage
    loadFromStorage() {
        if (localStorage.getItem(this.local_storage_var_name)) {
            this.setToggleState(this.getStorageValue());
        }
    }
    getStorageValue() {
        return localStorage.getItem(this.local_storage_var_name) === "true";
    }
}
// клас для налаштувань Cloudflare
export class InputSettingsElement extends SettingsElement {
    element;
    constructor(element, local_storage_var_name) {
        super(local_storage_var_name);
        this.element = element;
        this.updateValue();
    }
    // оновлює значення з localStorage
    updateValue() {
        if (this.element) {
            this.element.value = this.getStorageValue();
        }
    }
    saveValue() {
        localStorage.setItem(this.local_storage_var_name, this.element.value);
        return this.getValue();
    }
    getStorageValue() {
        return localStorage.getItem(this.local_storage_var_name) ?? "";
    }
    getValue() {
        return this.element.value ?? "";
    }
}
export class SelectSettingsElement extends SettingsElement {
    element;
    constructor(element, local_storage_var_name) {
        super(local_storage_var_name);
        this.element = element;
        this.updateValue();
    }
    // оновлює значення з localStorage
    updateValue() {
        if (this.element) {
            this.element.value = this.getStorageValue();
        }
    }
    getStorageValue() {
        return localStorage.getItem(this.local_storage_var_name) ?? "last";
    }
    saveValue() {
        localStorage.setItem(this.local_storage_var_name, this.element.value);
        return this.element.value;
    }
    getValue() {
        return this.element.value ?? "";
    }
}
// =====================================================
// КЛАС SETTINGS - керує всіма налаштуваннями
// =====================================================
export class IndexSettings {
    isGlobal_sett = null;
    safeMode_sett = null;
    readOnly_sett = null;
    index_sett_array = [];
    constructor() {
        this.isGlobal_sett = new Thumb(false, document.querySelector("#db-mode-toggle-switch"), "isGlobal");
        this.safeMode_sett = new Thumb(true, document.querySelector("#safe-mode-toggle-switch"), "safeMode");
        this.readOnly_sett = new Thumb(false, document.querySelector("#read-only-mode-toggle-switch"), "readOnly");
        this.index_sett_array = [this.isGlobal_sett, this.safeMode_sett, this.readOnly_sett];
        // завантажує значення з localStorage
        this.index_sett_array.forEach(val => {
            val.loadFromStorage();
        });
    }
    // отримує посилання на БД Cloudflare
    getBasicDbLink() {
        let basic_db_link = localStorage.getItem("basic_db_link") ?? "";
        if (basic_db_link === "") {
            const account_id = localStorage.getItem("cf_account_id");
            const db_id = localStorage.getItem("cf_db_id");
            let proxy_url = localStorage.getItem("proxy_url") ?? "";
            if (proxy_url.length) {
                if (proxy_url.at(proxy_url.length - 1) !== "/") {
                    proxy_url = `${proxy_url}/`;
                }
            }
            if (account_id && db_id) {
                basic_db_link = `${proxy_url}https://api.cloudflare.com/client/v4/accounts/${account_id}/d1/database/${db_id}/query`;
            }
        }
        return basic_db_link;
    }
}
export class CfSettings {
    cf_account_id_sett = null;
    cf_db_id_sett = null;
    cf_api_key_sett = null;
    proxy_url = null;
    cf_api_key_caption = null;
    cf_sett_array = [];
    constructor() {
        this.cf_api_key_caption = document.querySelector("#cf-api-key-caption");
        this.cf_account_id_sett = new InputSettingsElement(document.querySelector("#input-cf-account-id"), "cf_account_id");
        this.cf_db_id_sett = new InputSettingsElement(document.querySelector("#input-cf-db-id"), "cf_db_id");
        this.cf_api_key_sett = new InputSettingsElement(document.querySelector("#input-cf-api-key"), "cf_api_key");
        this.proxy_url = new InputSettingsElement(document.querySelector("#input-proxy-url"), "proxy_url");
        this.cf_sett_array = [this.cf_account_id_sett,
            this.cf_db_id_sett,
            this.cf_api_key_sett,
            this.proxy_url];
        this.cf_sett_array.forEach(val => {
            val.updateValue();
        });
    }
    updateApiCaption(new_value) {
        let capt = "";
        if (new_value.length >= 5) {
            capt = `...${new_value.slice(new_value.length - 5, new_value.length)}`;
        }
        else {
            capt = new_value;
        }
        this.cf_api_key_caption.textContent = capt;
    }
    setupCloudflareEventListeners() {
        if (this.cf_sett_array.length > 0) {
            this.cf_sett_array.forEach(val => {
                val.element.addEventListener("input", () => {
                    const saved_value = val.saveValue();
                    if (val.local_storage_var_name === "cf_api_key") {
                        this.updateApiCaption(saved_value);
                    }
                });
            });
        }
    }
}
export class CopyTableSettings {
    remote_table_name;
    clone_option;
    count_n;
    local_table_name;
    local_db_path;
    constructor() {
        this.remote_table_name = new InputSettingsElement(document.querySelector("#input-remote-table-name"), "input_remote_table_name");
        this.clone_option = new SelectSettingsElement(document.querySelector("#table-select-copy-mode"), "table_select_copy_mode");
        this.count_n = new InputSettingsElement(document.querySelector("#input-remote-db-table-writes-count"), "input_remote_db_table_writes_count");
        this.local_table_name = new InputSettingsElement(document.querySelector("#input-remote-db-table-source-table-name"), "input_remote_db_table_source_table_name");
        this.local_db_path = new InputSettingsElement(document.querySelector("#input-remote-db-table-local-db-path"), "input_remote_db_table_local_db_path");
    }
    // отримує динамічний шлях до локальної БД за допомогою db_id
    getLocalDbPath() {
        const db_id = localStorage.getItem("cf_db_id") || "default";
        return `bravsql-${db_id}.db`;
    }
    get() {
        let local_table_name_value = this.local_table_name.getValue();
        let local_db_path_value = this.local_db_path.getValue();
        // якщо назва локальної таблиці не вказана, використовуємо назву з віддаленої
        if (local_table_name_value === "") {
            local_table_name_value = this.remote_table_name.getValue();
        }
        // якщо шлях до локальної БД не вказаний, використовуємо динамічний шлях
        if (local_db_path_value === "") {
            local_db_path_value = this.getLocalDbPath();
        }
        return {
            remote_table_name: this.remote_table_name.getValue(),
            clone_option: this.clone_option.getValue(),
            count_n: Number(this.count_n.getValue()),
            local_table_name: local_table_name_value,
            local_db_path: local_db_path_value
        };
    }
}
// =====================================================
// КЛАС SQLQUERYINPUT - керує полем введення SQL-запиту
// =====================================================
export class SqlQueryInput {
    input;
    content;
    backdrop;
    value = "";
    autocomplete;
    constructor(input, content, backdrop, autocomplete) {
        this.input = input;
        this.content = content;
        this.backdrop = backdrop;
        this.autocomplete = autocomplete;
        // завантажуємо збережене значення
        this.value = localStorage.getItem("input_value") ?? "";
        if (this.value !== "") {
            this.input.value = this.value;
        }
        this.setupEventListeners();
        this.updateContent();
    }
    // налаштовує обробники подій
    setupEventListeners() {
        this.autocomplete.btn.addEventListener('click', () => {
            this.autocomplete.complete();
            this.updateContent();
        });
        this.input.addEventListener("input", () => this.onInput());
        this.input.addEventListener("scroll", () => this.syncScroll());
    }
    onInput() {
        this.updateContent();
        this.autocomplete.update();
    }
    // оновлює підсвічування синтаксису
    updateContent() {
        this.value = this.input.value;
        let text = this.value;
        // якщо текстове поле закінчується перенесенням рядка, додається пробіл
        if (text[text.length - 1] === "\n") {
            text += " ";
        }
        this.content.textContent = text;
        delete this.content.dataset.highlighted;
        // підсвічування синтаксису
        window.hljs.highlightElement(this.content);
        localStorage.setItem("input_value", this.value);
    }
    // синхронізує прокручування
    syncScroll() {
        this.backdrop.scrollTop = this.input.scrollTop;
        this.backdrop.scrollLeft = this.input.scrollLeft;
    }
    // отримує поточний SQL-запит
    getValue() {
        return this.input.value;
    }
}
// =====================================================
// КЛАС SETTINGSMENU - керує меню налаштувань
// =====================================================
export class SettingsMenu {
    header_settings_area;
    header_settings;
    settings_area;
    close_btn;
    constructor(header_settings_area, settings_area, close_btn) {
        this.header_settings_area = header_settings_area;
        this.header_settings = header_settings_area.firstElementChild;
        this.settings_area = settings_area;
        this.close_btn = close_btn;
        this.setupEventListeners();
    }
    // налаштовує обробники подій
    setupEventListeners() {
        this.header_settings.addEventListener("click", (event) => this.open(event));
        this.close_btn.addEventListener("click", () => this.close());
    }
    // відкриває меню
    open(event) {
        event.stopPropagation();
        this.settings_area.style.display = "inline";
        this.header_settings.classList.remove("close");
        this.header_settings.classList.add("open");
        this.settings_area.classList.remove("close");
        this.settings_area.classList.add("open");
        document.addEventListener("click", (e) => this.handleClickOutside(e));
    }
    // закриває меню
    close() {
        this.header_settings_area.style.display = "inline";
        this.header_settings.classList.remove("open");
        this.header_settings.classList.add("close");
        this.settings_area.classList.remove("open");
        this.settings_area.classList.add("close");
        document.removeEventListener("click", (e) => this.handleClickOutside(e));
    }
    // обробляє клік поза меню
    handleClickOutside(event) {
        if (!event.composedPath().includes(this.settings_area)) {
            this.close();
        }
    }
}
// =====================================================
// КЛАС SAFEMODEMODAL - модальне вікно безпечного режиму
// =====================================================
export class SafeModeModal {
    modal;
    ok_btn;
    cancel_btn;
    close_btn;
    onConfirm = null;
    constructor(modal, ok_btn, cancel_btn, close_btn) {
        this.modal = modal;
        this.modal.style.display = "none";
        this.ok_btn = ok_btn;
        this.cancel_btn = cancel_btn;
        this.close_btn = close_btn;
        this.setupEventListeners();
    }
    // налаштовує обробники подій
    setupEventListeners() {
        this.ok_btn.addEventListener("click", () => this.confirm());
        this.cancel_btn.addEventListener("click", () => this.cancel());
        this.close_btn.addEventListener("click", () => this.cancel());
    }
    // показує модальне вікно
    show(onConfirm) {
        this.onConfirm = onConfirm;
        this.modal.style.display = "block";
        this.modal.classList.add("active");
        setTimeout(() => {
            this.modal.classList.remove("inactive");
        }, 0);
    }
    // підтверджує дію
    confirm() {
        this.hide();
        if (this.onConfirm) {
            this.onConfirm();
        }
    }
    // скасовує дію
    cancel() {
        this.hide();
    }
    // приховує модальне вікно
    hide() {
        this.modal.classList.remove("active");
        this.modal.classList.add("inactive");
        setTimeout(() => {
            this.modal.style.display = "none";
        }, 150);
    }
}
// =====================================================
// КЛАС SQLWORKER - керує Web Worker для SQLite
// =====================================================
export class SqlWorker {
    worker;
    consoleOutput;
    remote_sql_command_ok = true;
    databases_select;
    databases = [];
    current_db_name = "bravsql-general.db";
    constructor(consoleOutput) {
        this.consoleOutput = consoleOutput;
        this.worker = new Worker('js/sql-worker.js?sqlite3.dir=jswasm');
        this.databases_select = document.querySelector("#local-db-path");
        this.current_db_name = localStorage.getItem("current_db_name") ?? "bravsql-general.db";
        this.setupEventListeners();
    }
    // налаштовує обробники подій
    setupEventListeners() {
        this.worker.onmessage = (event) => this.handleMessage(event);
        if (this.databases_select) {
            this.databases_select.addEventListener("change", (event) => {
                const target = event.target;
                localStorage.setItem("current_db_name", target.value);
                this.current_db_name = target.value;
            });
        }
    }
    // обробляє повідомлення від worker'а
    handleMessage(event) {
        const data = event.data;
        switch (data.type) {
            case 'log':
                // логи
                break;
            case 'result':
                this.remote_sql_command_ok = true;
                const table = new Table(data.payload.results);
                const message = new ConsoleTableMessage([], table, false);
                this.consoleOutput.print(message);
                break;
            case 'copy_result':
                const mes = new ConsoleTextMessage(["console-text"], `Таблицю ${data.payload.table_name} було клоновано до БД ${data.payload.db_name}`, false);
                this.consoleOutput.print(mes);
                const databases_str = localStorage.getItem("local_databases") ?? '[]';
                if (!databases_str.includes(data.payload.db_name)) {
                    const databases = JSON.parse(databases_str);
                    databases.push({ db_path: data.payload.db_name, created: this.getCurrentISOTime() });
                    localStorage.setItem("local_databases", JSON.stringify(databases));
                }
                this.showDBList();
                break;
            case 'error':
                this.remote_sql_command_ok = false;
                // перезавантажуємо сторінку при помилці ініціалізації БД
                if (data.payload.message === 'Database not initialized') {
                    location.reload();
                }
                else {
                    const errorMessage = new ConsoleTextMessage(["console-text", "error-text"], data.payload.message, false);
                    this.consoleOutput.print(errorMessage);
                }
                break;
            case 'ready':
                this.showDBList();
                break;
            case 'db_created': {
                const db_name = data.payload.db_name;
                const db_list_str = this.getDBList();
                if (db_list_str.includes(db_name))
                    break;
                else {
                    const db_list = JSON.parse(db_list_str);
                    db_list.push({ db_path: db_name, created: this.getCurrentISOTime() });
                    this.setDBList(JSON.stringify(db_list));
                }
            }
        }
    }
    getCurrentISOTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }
    setDBList(value) {
        localStorage.setItem("local_databases", value);
    }
    getDBList() {
        return localStorage.getItem("local_databases") ?? "[]";
    }
    showDBList() {
        if (this.databases_select) {
            const select_children = Array.from(this.databases_select.children);
            select_children.forEach((child, index) => {
                if (index > 0) {
                    child.remove();
                }
            });
            this.databases = JSON.parse(this.getDBList());
            this.databases.forEach((obj) => {
                const option = document.createElement('option');
                option.value = obj.db_path;
                if (obj.db_path.length > 16) {
                    option.textContent = obj.db_path.slice(0, 14) + "...";
                }
                else {
                    option.textContent = obj.db_path;
                }
                this.databases_select.appendChild(option);
            });
            // Встановлюємо значення ПІСЛЯ додавання усіх options
            this.databases_select.value = this.current_db_name;
        }
    }
    // відправляє SQL-запит до worker'а
    sendQuery(query, db_path = "bravsql-general.db") {
        // замінюємо .tables на SQL-запит
        query = query.replaceAll('.tables', 'SELECT name FROM sqlite_master');
        this.worker.postMessage({
            type: 'query',
            payload: { sql_query: query, db_name: db_path }
        });
    }
    sendCopyQuery(query, table_name, db_path = "bravsql-general.db") {
        this.worker.postMessage({
            type: 'copy_query',
            payload: { sql_query: query, table_name: table_name, db_name: db_path }
        });
    }
}
// =====================================================
// КЛАС REMOTESQLSENDER - відправляє запити на сервер
// =====================================================
export class RemoteSqlSender {
    settings;
    select_element;
    constructor(settings) {
        this.settings = settings;
        this.select_element = document.querySelector('#remote-tables-names');
        this.sendQuery("select * from sqlite_master")
            .then(res => {
            if (res.success) {
                res.result[0].results.forEach((val) => {
                    if (val.name !== '_cf_KV') {
                        const option = document.createElement('option');
                        option.value = val.name;
                        if (val.name.length > 16) {
                            option.textContent = val.name.slice(0, 14) + "...";
                        }
                        else {
                            option.textContent = val.name;
                        }
                        this.select_element.appendChild(option);
                    }
                });
            }
        })
            .catch(e => e);
    }
    async updateRemoteTablesList() {
        const options = Array.from(this.select_element.options);
        options.forEach((elem) => {
            if (elem.value !== "") {
                elem.remove();
            }
        });
        this.sendQuery("select * from sqlite_master")
            .then(res => {
            if (res.success) {
                res.result[0].results.forEach((val) => {
                    if (val.name !== '_cf_KV') {
                        const option = document.createElement('option');
                        option.value = val.name;
                        if (val.name.length > 18) {
                            option.textContent = val.name.slice(0, 16) + "...";
                        }
                        else {
                            option.textContent = val.name;
                        }
                        this.select_element.appendChild(option);
                    }
                });
            }
        })
            .catch(e => e);
    }
    // відправляє SQL-запит на віддалений сервер
    async sendQuery(query) {
        const basic_db_link = this.settings.getBasicDbLink();
        // замінюємо .tables на SQL-запит
        query = query.replaceAll('.tables', 'SELECT name FROM sqlite_master');
        if (basic_db_link === "") {
            return {
                success: false,
                errors: [{ message: "відсутнє_базове_посилання_на_бд" }],
                result: []
            };
        }
        else if (basic_db_link.includes('api.cloudflare.com')) {
            const apiKey = localStorage.getItem("cf_api_key");
            if (!apiKey) {
                return {
                    success: false,
                    errors: [{ message: "API ключ не знайдено" }],
                    result: []
                };
            }
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    sql: query,
                })
            };
            try {
                const response = await fetch(basic_db_link, options);
                const data = await response.json();
                return data;
            }
            catch (error) {
                return {
                    success: false,
                    errors: [{ message: `Помилка мережі або налаштувань віддаленої БД: ${error}` }],
                    result: []
                };
            }
        }
        return {
            success: false,
            errors: [{ message: "Невідома помилка" }],
            result: []
        };
    }
}
export class CopyTablePageMenu {
    element;
    caption_element;
    close_btn;
    table_name_element;
    clone_options_element;
    count_n_element;
    src_table_name_element;
    local_db_path_element;
    copy_btn;
    constructor(element, caption_element, close_btn, table_name_element, clone_options_element, count_n_element, src_table_name_element, local_db_path_element, copy_btn) {
        this.element = element;
        this.caption_element = caption_element;
        this.close_btn = close_btn;
        this.table_name_element = table_name_element;
        this.clone_options_element = clone_options_element;
        this.count_n_element = count_n_element;
        this.src_table_name_element = src_table_name_element;
        this.local_db_path_element = local_db_path_element;
        this.copy_btn = copy_btn;
    }
    close() {
        const element = this.element;
        if (element.classList.contains("active")) {
            element.classList.remove("active");
            element.classList.add("inactive");
            setTimeout(() => element.style.display = "none", 200);
        }
    }
    currentRemoteTableName() {
        return this.table_name_element.value;
    }
    currentCloneMode() {
        return this.clone_options_element.value;
    }
    countN() {
        return Number(this.count_n_element.value);
    }
    currentSrcTableName() {
        if (this.src_table_name_element.value !== "") {
            return this.src_table_name_element.value;
        }
        return null;
    }
    currentLocalDBPath() {
        if (this.local_db_path_element.value !== "") {
            return this.local_db_path_element.value;
        }
        return null;
    }
}
