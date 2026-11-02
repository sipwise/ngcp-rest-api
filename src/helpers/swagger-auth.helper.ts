// swagger ui stores what is entered in the Authorize dialog without checking it, so new credentials are checked here
// with GET /auth/userinfo: the user is shown in the title bar (lock icon and username) and the dialog closes, wrong
// credentials are logged out again with an error in the dialog; Logout clears the user.
// A reload of the page keeps the login: an Access Token (never a password; for Basic one valid for an hour, from
// POST /auth/jwt) is kept in the session storage of the tab and restored as the JWT login on a reload only, so the
// page opened from a link, a bookmark or another tab starts logged out
export const swaggerAuthJs = `
(function () {
    const base = window.location.pathname.replace(/\\/(index\\.html)?$/, '')
    const url = base + '/auth/userinfo'
    const storageKey = 'ngcp-api-auth'
    const tokenLifetime = 3600
    // the username per accepted credentials; rejected ones are logged out, so entering them again checks them again
    const results = new Map()
    const pending = new Set()
    let present = new Set()
    let shown = null
    let restored = false
    // the credentials the kept token belongs to: logging them out drops it
    let keptFor = null

    const base64 = text => window.btoa(String.fromCharCode(...new TextEncoder().encode(text)))

    // the credentials of the dialog, in the order the title bar prefers them
    function credentials() {
        const authorized = window.ui && window.ui.authSelectors && window.ui.authSelectors.authorized()
        if (!authorized)
            return []
        const list = []
        const jwt = authorized.getIn(['JWT', 'value'])
        if (jwt)
            list.push({scheme: 'JWT', key: 'JWT ' + jwt, header: 'Bearer ' + jwt})
        const basic = authorized.getIn(['basic', 'value'])
        const username = basic && basic.get('username')
        if (username) {
            const login = username + ':' + (basic.get('password') || '')
            list.push({scheme: 'basic', key: 'basic ' + login, header: 'Basic ' + base64(login)})
        }
        return list
    }

    function render() {
        const line = document.querySelector('.swagger-ui .info .main .ngcp-user')
        if (!line)
            return
        const user = (credentials().map(c => results.get(c.key)).find(Boolean)) || null
        line.hidden = !user
        if (user == shown && line.childNodes.length)
            return
        shown = user
        line.textContent = ''
        if (!user)
            return
        line.title = user
        line.innerHTML = '<svg width="12" height="12"><use href="#locked" xlink:href="#locked"></use></svg>'
        line.append(Object.assign(document.createElement('b'), {textContent: user}))
    }

    function saved() {
        try {
            const auth = JSON.parse(window.sessionStorage.getItem(storageKey))
            return auth && auth.token && Date.parse(auth.expires_at) > Date.now() ? auth : null
        } catch (e) {
            return null
        }
    }

    function save(credential, token, username, expiresAt) {
        keptFor = credential.key
        window.sessionStorage.setItem(storageKey, JSON.stringify({token, username, expires_at: expiresAt}))
    }

    function forget() {
        keptFor = null
        window.sessionStorage.removeItem(storageKey)
    }

    // the expiry of a JWT (exp, seconds), an hour if it has none
    function expiry(token) {
        try {
            const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
            if (payload.exp)
                return new Date(payload.exp * 1000).toISOString()
        } catch (e) {
            // not a readable jwt
        }
        return new Date(Date.now() + tokenLifetime * 1000).toISOString()
    }

    // the token of the login: a JWT as entered, for Basic a new Access Token; a failure only means no restore
    function keep(credential, username) {
        if (credential.scheme == 'JWT') {
            const token = credential.key.slice(4)
            save(credential, token, username, expiry(token))
            return
        }
        fetch(base + '/auth/jwt', {
            method: 'POST',
            headers: {Authorization: credential.header, Accept: 'application/json', 'Content-Type': 'application/json'},
            body: JSON.stringify({expires_in: tokenLifetime}),
        }).then(res => res.ok ? res.json() : null).then(jwt => {
            if (jwt && jwt.access_token && credentials().some(c => c.key == credential.key))
                save(credential, jwt.access_token, username, jwt.expires_at)
        }).catch(() => {})
    }

    // once swagger ui knows the security schemes, a reload gets the kept token back as the JWT login
    function restore() {
        if (restored || !window.ui || !window.ui.specSelectors || !window.ui.specSelectors.securityDefinitions())
            return
        restored = true
        const navigation = window.performance.getEntriesByType('navigation')[0]
        const auth = saved()
        if (!auth || !navigation || navigation.type != 'reload') {
            forget()
            return
        }
        keptFor = 'JWT ' + auth.token
        results.set(keptFor, auth.username)
        window.ui.preauthorizeApiKey('JWT', auth.token)
    }

    function showError(message) {
        const content = document.querySelector('.swagger-ui .dialog-ux .modal-ux-content')
        if (!content)
            return
        let error = content.querySelector('.ngcp-auth-error')
        if (!error) {
            error = document.createElement('div')
            error.className = 'ngcp-auth-error'
            content.prepend(error)
        }
        error.textContent = message
    }

    function verify(credential) {
        pending.add(credential.key)
        const error = document.querySelector('.swagger-ui .ngcp-auth-error')
        if (error)
            error.remove()
        fetch(url, {headers: {Authorization: credential.header, Accept: 'application/json'}}).then(res => {
            if (!res.ok)
                throw new Error(res.status + ' ' + res.statusText)
            return res.json()
        }).then(user => {
            const username = user.username || String(user.id)
            results.set(credential.key, username)
            keep(credential, username)
            window.ui.authActions.showDefinitions(false)
        }).catch(err => {
            showError(window.ngcpFormat(window.ngcpText('loginFailed'), {error: err.message}))
            window.ui.authActions.logout([credential.scheme])
        }).finally(() => {
            pending.delete(credential.key)
            render()
        })
    }

    function sync() {
        restore()
        if (!restored)
            return
        const current = credentials()
        if (keptFor && !current.some(c => c.key == keptFor))
            forget()
        for (const credential of current) {
            if (results.has(credential.key)) {
                // entered again after a logout: known to be fine
                if (!present.has(credential.key))
                    window.ui.authActions.showDefinitions(false)
            } else if (!pending.has(credential.key))
                verify(credential)
        }
        present = new Set(current.map(c => c.key))
        render()
    }

    new MutationObserver(sync).observe(document.body, {childList: true, subtree: true})
    document.addEventListener('ngcp-header', sync)
})()
`

export const swaggerAuthCss = `
.swagger-ui .info .main .ngcp-user:not([hidden]) { display: flex; align-items: center; gap: 5px }
.swagger-ui .info .main .ngcp-user svg { flex: none; fill: #fff }
.swagger-ui .info .main .ngcp-user b { overflow: hidden; text-overflow: ellipsis }
html.ngcp-scrolled .swagger-ui .info .main .ngcp-user svg { width: 10px; height: 10px }
.swagger-ui .dialog-ux .modal-ux-content .ngcp-auth-error { margin: 0 0 12px; padding: 8px 12px; border-radius: 4px;
    background: rgba(249, 62, 62, .1); color: #c62828; font-size: 13px; font-weight: 600 }
html.dark-mode .swagger-ui .dialog-ux .modal-ux-content .ngcp-auth-error { color: #ff8a80 }
`
