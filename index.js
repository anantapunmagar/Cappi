const mineflayer = require('mineflayer')
const { status } = require('minecraft-server-util')

// ===================== CONFIG =====================
const BOT_NAME = 'Cappi'
const SERVER_IP = 'ananta.mcsh.io'
const POLL_INTERVAL = 30000
const TARGET_PLAYER = 'Ananta'

// Dashboard reporting — set these env vars or hardcode for local testing
const DASHBOARD_URL = process.env.CAPPI_DASHBOARD_URL   // e.g. https://your-app.vercel.app
const CAPPI_SECRET  = process.env.CAPPI_SECRET || 'changeme'

let bot = null
let isBotConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// ===================== DASHBOARD REPORTING =====================
async function report(payload) {
    if (!DASHBOARD_URL) return   // silent if not configured
    try {
        const res = await fetch(`${DASHBOARD_URL}/api/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cappi-secret': CAPPI_SECRET
            },
            body: JSON.stringify({ timestamp: Date.now(), ...payload })
        })
        if (!res.ok) console.log(`🌙 [CAPPI] Dashboard report failed: HTTP ${res.status}`)
    } catch (err) {
        console.log(`🌙 [CAPPI] Dashboard report error: ${err.message}`)
    }
}

// ===================== SERVER STATUS CHECK =====================
async function isTargetOnline() {
    try {
        const res = await status(
            SERVER_IP.split(':')[0],
            parseInt(SERVER_IP.split(':')[1]) || 25565,
            { timeout: 8000 }
        )

        let playerList = []
        if (res.players.sample && Array.isArray(res.players.sample)) {
            playerList = res.players.sample.map(p => p.name.toLowerCase())
        }

        const isOnline = playerList.includes(TARGET_PLAYER.toLowerCase())

        console.log(`🌙 [CAPPI] API SCAN → ${TARGET_PLAYER} is ${isOnline ? '✅ ONLINE' : '❌ OFFLINE'} (${res.players.online}/${res.players.max} players)`)

        // Report heartbeat to dashboard
        await report({
            type: 'server_poll',
            botStatus: isBotConnected,
            playerCount: res.players.online,
            maxPlayers: res.players.max
        })

        return {
            online: isOnline,
            playerCount: res.players.online,
            maxPlayers: res.players.max
        }
    } catch (err) {
        console.log(`🌙 [CAPPI] API SCAN → Error checking server: ${err.message}`)
        return { online: false, playerCount: 0, maxPlayers: 20 }
    }
}

// ===================== MONITOR LOGIC =====================
async function checkAndAct() {
    const status = await isTargetOnline()

    if (!status.online && !isBotConnected) {
        console.log(`🌙 [CAPPI] ${TARGET_PLAYER} is offline → Bot joining the server now!`)
        createBot()
    }
    else if (status.online && isBotConnected) {
        console.log(`🌙 [CAPPI] ${TARGET_PLAYER} joined the server → Bot leaving immediately!`)
        if (bot) bot.quit()
    }
}

// ===================== BOT CREATION =====================
function createBot() {
    console.log(`🌙 [CAPPI] Creating bot instance... (attempt #${reconnectAttempts + 1})`)

    bot = mineflayer.createBot({
        host: SERVER_IP.split(':')[0],
        port: parseInt(SERVER_IP.split(':')[1]) || 25565,
        username: BOT_NAME,
        auth: 'offline',
        version: false,
        checkTimeoutInterval: 45000
    })

    // ===================== EVENTS =====================
    bot.on('kicked', (reason) => {
        const kickReason = typeof reason === 'object' ? JSON.stringify(reason, null, 2) : reason
        console.log(`🌙 [CAPPI] Kicked: ${kickReason}`)
    })

    bot.on('end', (reason) => {
        isBotConnected = false
        bot = null

        const endReason = typeof reason === 'object' ? JSON.stringify(reason, null, 2) : reason || 'unknown'
        console.log(`🌙 [CAPPI] Disconnected (${endReason})`)

        report({ type: 'bot_disconnect' })

        if (endReason.toLowerCase().includes('duplicate') || endReason.toLowerCase().includes('already')) {
            console.log(`🌙 [CAPPI] Duplicate connection → waiting longer`)
        } else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++
        } else {
            console.log(`🌙 [CAPPI] Max reconnect attempts reached.`)
            reconnectAttempts = 0
        }
    })

    bot.on('error', (err) => {
        console.log(`🌙 [CAPPI] Error: ${err.message}`)
    })

    bot.on('spawn', () => {
        console.log(`🌙 [CAPPI] ✅ Successfully spawned on the server!`)
        isBotConnected = true
        reconnectAttempts = 0
        report({ type: 'bot_spawn' })
    })

    // Track players joining/leaving
    bot.on('playerJoined', (player) => {
        if (player.username === BOT_NAME) return
        console.log(`🌙 [CAPPI] 👋 ${player.username} joined`)
        report({ type: 'player_join', player: player.username })
    })

    bot.on('playerLeft', (player) => {
        if (player.username === BOT_NAME) return
        console.log(`🌙 [CAPPI] 👋 ${player.username} left`)
        report({ type: 'player_leave', player: player.username })
    })

    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString().trim()
        if (msg.length > 0) console.log(`🌙 [CHAT] ${msg}`)
    })

    bot.on('chat', (username, message) => {
        if (username === BOT_NAME) return
        const msg = message.toLowerCase().trim()

        // Report chat to dashboard
        report({ type: 'chat', username, message })

        if (msg === 'cappi quit' || msg === 'mita stop') {
            console.log(`🌙 [CAPPI] Manual quit requested`)
            if (bot) bot.quit()
        }
        if (msg === 'cappi status') {
            bot.chat(`Cappi monitor is ${isBotConnected ? 'ONLINE' : 'OFFLINE'} | Target: ${TARGET_PLAYER}`)
        }
    })
}

// ===================== START MONITOR =====================
console.log(`🌙 [CAPPI] 🚀 Starting Ananta monitor (polls every ${POLL_INTERVAL / 1000} seconds)...`)
console.log(`🌙 [CAPPI] Target player: ${TARGET_PLAYER}`)
console.log(`🌙 [CAPPI] Dashboard: ${DASHBOARD_URL || 'not configured'}`)

checkAndAct()
setInterval(checkAndAct, POLL_INTERVAL)

process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught exception:', err.message)
})

process.on('SIGINT', () => {
    console.log('🌙 [CAPPI] Shutting down gracefully...')
    report({ type: 'bot_disconnect' }).finally(() => {
        if (bot) bot.quit()
        process.exit(0)
    })
})
