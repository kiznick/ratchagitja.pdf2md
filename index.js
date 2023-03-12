const fs = require('fs')
const pdf = require('pdf-parse')
const csv = require('csvtojson')
const axios = require('axios')
const prompt = require("prompt-sync")({ sigint: true })

const init = async () => {
    if (!fs.existsSync('./data.json')) {
        const response = await axios('https://raw.githubusercontent.com/narze/ratchagitja.md/main/data/ratchakitcha.csv')
        if (response.status !== 200) {
            console.log('Error: Cannot fetch data from ratchakitcha.csv')
            return
        }
        const data = await csv().fromString(response.data)

        fs.writeFileSync('./data.json', JSON.stringify(data, null, 4))
        console.log('data.json created')
    }

    const fileId = prompt('Enter file id: ')

    if(!fileId) {
        console.error('Error: File id is required')
        return
    }

    const data = JSON.parse(fs.readFileSync('./data.json'))
    
    const file = data.find(file => file.id === fileId)

    if(!file) {
        console.error('Error: File id not found')
        return
    }

    console.log('Downloading file...')
    const response = await axios(file.URL, {
        responseType: 'arraybuffer'
    })

    if (response.status !== 200) {
        console.log('Error: Cannot down file from ' + file.URL)
        return
    }

    const filename = file.URL.split('/').pop().split('.').shift()
    const fileBuffer = Buffer.from(response.data, 'binary')

    console.log('File downloaded')

    const glossary = {
        ' า': 'ำ',
        'หนา  ': 'หน้า ',
        'เลม  ': 'เล่ม ',
        'เจา': 'เจ้า',
        'ทรัพย': 'ทรัพย์',
        'ทักษ': 'ทักษ์',
        'ลม': 'ล้ม',
        'จันทร': 'จันทร์',
        'ทิพย': 'ทิพย์',
        'รัตน': 'รัตน์',
        'แต': 'แต่',
        'อยู': 'อยู่',
        'บาน': 'บ้าน',
        'หมู': 'หมู่',
        'มา': 'ม้า',
        'ได': 'ได้',
        'ฟอง': 'ฟ้อง',
        'ตอ': 'ต่อ',
        'ดวย': 'ด้วย',
        'ให': 'ให้',
        'แลว': 'แล้ว',
        'รักษ': 'รักษ์',
        'ผู': 'ผู้',
        'เปน': 'เป็น',
        'หนา': 'หน้า',
        'ผู': 'ผู้',
        'แหง': 'แห่ง',
        'โจทก': 'โจทก์',
        'ตอง': 'ต้อง',
        'ฝาย': 'ฝ่าย',
        'คู': 'คู่',
        'ไม': 'ไม่',
        'ไซต': 'ไซต์',
        'กลุม': 'กลุ่ม',

        '๑': '1',
        '๒': '2',
        '๓': '3',
        '๔': '4',
        '๕': '5',
        '๖': '6',
        '๗': '7',
        '๘': '8',
        '๙': '9',
        '๐': '0',
    }
    
    pdf(fileBuffer).then(function(data) {
        const rawText = data.text.trim().replaceAll('  ', ' ')
        
        const text = Object.keys(glossary).reduce((acc, cur) => {
            return acc.replaceAll(cur, glossary[cur])
        }, rawText)

        fs.writeFile(`./out/${filename}.txt`, text, function (err) {
            if (err) throw err;
            console.log('Saved!');
        })

        const text_line = text.split("\n")
        let firstLineBlank = null
        let headerCondition = 0
        let needLoop = true
        let startLine = 0

        text_line.splice(-4, 4) // delete last header

        while(needLoop) {
            needLoop = false
            console.log('-------------------------------------------------------')
            for (let i = startLine; i < text_line.length; i++) {
                const line = text_line[i]

                // check header
                if(firstLineBlank != null) {
                    if(line.startsWith('หน้า ') && headerCondition == 1) {
                        headerCondition = 2
                        console.log('หน้า')
                    } else if(line.length == 1 && headerCondition == 2) {
                        headerCondition = 3
                        console.log('mid space')
                    } else if(line.startsWith('เล่ม ' + file.เล่ม) && headerCondition == 3) {
                        headerCondition = 4
                        console.log('เล่ม')
                    } else if(line.length == 0 && headerCondition == 4) {
                        text_line.splice(firstLineBlank, 5)
                        startLine = i
                        needLoop = true
                        headerCondition = 0

                        console.log('remove header', firstLineBlank)
                        firstLineBlank = null
                        break
                    } else {
                        console.log('pass', i, line)
                        firstLineBlank = null
                        headerCondition = 0
                    }
                } else if(line.length == 1 && headerCondition == 0) {
                    firstLineBlank = i
                    headerCondition = 1
                    console.log('first blank', i)
                }
            }
        }

        const md = `
        ---
        name: ${file.เรื่อง}
        date: ${file.วันที่}
        category: ${file.ประเภท}
        เล่ม: ${file.เล่มที่}
        ตอนที่: ${file.ตอน}
        source: ${file.URL}
        ---
        `.replaceAll('        ', '').trim() + "\n" + text_line.join("\n")

        fs.writeFile(`./out/${filename}.md`, md, function (err) {
            if (err) throw err;
            console.log('Saved !');
        })
    });
}

init()