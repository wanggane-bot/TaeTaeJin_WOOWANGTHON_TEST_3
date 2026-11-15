// 운영 알림 시험용 작은 서버. Node 기본 모듈만 쓴다(설치할 의존성 없음).
// 비밀값 CHAOS로 일부러 장애를 낸다(README "시나리오"). 비어 있으면 정상 서버다.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = Number(process.env.PORT) || 8080
const CHAOS = process.env.CHAOS ?? ''
const CHAOS_AFTER_SECONDS = Number(process.env.CHAOS_AFTER_SECONDS) || 180
const page = fs.readFileSync(path.join(__dirname, 'public', 'index.html'))
const startedAt = Date.now()
let healthy = true

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'GET' && url.pathname === '/') {
    send(res, 200, 'text/html; charset=utf-8', page)
  } else if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, healthy ? 200 : 503, 'application/json', JSON.stringify({ ok: healthy }))
  } else if (req.method === 'GET' && url.pathname === '/api/info') {
    send(res, 200, 'application/json', JSON.stringify({ uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), chaos: CHAOS || null }))
  } else {
    send(res, 404, 'application/json', JSON.stringify({ error: 'not found' }))
  }
  console.log(`${req.method} ${url.pathname} ${res.statusCode}`)
})

server.listen(PORT, () => console.log(`listening on ${PORT}`))

// 배포 확인(Verify)과 공개 주소 전환을 통과한 뒤에 장애가 나도록 CHAOS_AFTER_SECONDS(기본 180초) 뒤에 시작한다.
if (CHAOS === 'crash') {
  console.log(`chaos: CHAOS=crash, process will exit in ${CHAOS_AFTER_SECONDS}s`)
  setTimeout(() => {
    console.error(`chaos: CHAOS=crash test fault, exiting with code 1 after ${CHAOS_AFTER_SECONDS}s`)
    process.exit(1)
  }, CHAOS_AFTER_SECONDS * 1000)
} else if (CHAOS === 'unready') {
  console.log(`chaos: CHAOS=unready, /api/health will answer 503 in ${CHAOS_AFTER_SECONDS}s`)
  setTimeout(() => {
    healthy = false
    console.error('chaos: CHAOS=unready test fault, /api/health now answers 503')
  }, CHAOS_AFTER_SECONDS * 1000)
} else if (CHAOS !== '') {
  console.warn(`chaos: unknown CHAOS=${CHAOS}, running normally`)
}

process.on('SIGTERM', () => process.exit(0))
