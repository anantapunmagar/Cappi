const mineflayer = require('mineflayer')
const { status } = require('minecraft-server-util')   // ← Make sure this is installed

// ===================== CONFIG =====================
const BOT_NAME = 'Cappi'
const SERVER_IP = 'ananta.mcsh.io'
const POLL_INTERVAL = 30000          // 30 seconds
const TARGET_PLAYER = 'Ananta'

let bot = null
let isBotConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// ===================== API STATUS CHECK =====================
async function isTargetOnline() {
    try {
        const res = await status(
            SERVER_IP.split(':')[0],
            parseInt(SERVER_IP.split(':')[1]) || 25565,
            { timeout: 8000 }   // increased timeout for stability
        )

        // Some servers hide the player list → we fall back to just checking player count
        let playerList = []
        if (res.players.sample && Array.isArray(res.players.sample)) {
            playerList = res.players.sample.map(p => p.name.toLowerCase())
        }

        const isOnline = playerList.includes(TARGET_PLAYER.toLowerCase())
        
        console.log(`🌙 [CAPPI] API SCAN → ${TARGET_PLAYER} is ${isOnline ? '✅ ONLINE' : '❌ OFFLINE'} (${res.players.online}/${res.players.max} players)`)

        return { 
            online: isOnline, 
            playerCount: res.players.online 
        }
    } catch (err) {
        console.log(`🌙 [CAPPI] API SCAN → Error checking server: ${err.message}`)
        return { online: false, playerCount: 0 }
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
    })

    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString().trim()
        if (msg.length > 0) console.log(`🌙 [CHAT] ${msg}`)
    })

    bot.on('chat', (username, message) => {
        if (username === BOT_NAME) return
        const msg = message.toLowerCase().trim()

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

// First immediate check
checkAndAct()

// Then poll every 30 seconds
setInterval(checkAndAct, POLL_INTERVAL)

// ===================== PROCESS HANDLERS =====================
process.on('uncaughtException', (err) => {
    console.error('⚠️ Uncaught exception:', err.message)
})

process.on('SIGINT', () => {
    console.log('🌙 [CAPPI] Shutting down gracefully...')
    if (bot) bot.quit()
    process.exit(0)
})