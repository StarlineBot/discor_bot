const cron = require('cron')
const { DateTime } = require('luxon')
const axios = require('axios')
const cheerio = require('cheerio')
const { EmbedBuilder } = require('discord.js')
const guildModule = require('../../modules/getGuildInfo')

const now = DateTime.now().setLocale('ko')
const { todayVeteran, tomorrowVeteran, getTodayMission, getTomorrowMission } = require(
  '../../modules/todayMission')

// 슬래시커맨드를 삭제하고 다시 시작해야 할때
const isDelete = false
const channelId = process.env.NODE_ENV === 'development'
  ? process.env.DEV_CHANNEL_ID
  : process.env.CHANNEL_ID
const otherChannelId = process.env.DEV_CHANNEL_ID
const basicErrorMessage = '오늘은 섯다라인 휴업중 🫥'
module.exports = async (client) => {
  console.log(`server: ${process.env.NODE_ENV}, ${client.user.tag} is online!`)

  if (isDelete) {
    const fetchSlash = await client.application.commands.fetch()
    console.log(fetchSlash)

    await Promise.all(fetchSlash.map(async slash => {
      await client.application.commands.delete(slash.id)
    }))
  }

  await client.guilds.cache.forEach(guild => {
    guild.members.fetch()
  })

  client.guilds.cache.forEach(guild => {
    const guildInfo = guildModule.getGuildInfo(guild.id)
    // 길드별로 해야할일이 있을때
    console.log(guildInfo)
  })

  const eachHoursJob = new cron.CronJob('0 * * * *', function () {
    const channel = client.channels.cache.get(otherChannelId)
    try {
      const now = new Date()
      channel.send(`현재 ${now.getHours()}시 ${now.getMinutes()}분 아직 살아있음...`)
    } catch (error) {
      channel.send(basicErrorMessage)
    }
  })

  console.log('eachHoursJob start!')
  eachHoursJob.start()

  // 매일 아침 8시에 필요한 정보들을 가져와 채널로 전송
  const cronSchedule = process.env.NODE_ENV === 'development'
    ? '0 * * * *'
    : '0 08 * * *'
  const dailyJob = new cron.CronJob(cronSchedule, async function () {
    const channel = client.channels.cache.get(channelId)
    try {
      channel.send(
          `오늘은 ${now.toFormat('yyyy년 MM월 dd일 cccc')}, 오늘의 미션과 간추린뉴스 전달해줄게~!😎`)
      const todayMissionObject = await getTodayMission()
      const todayMission = todayMissionObject.data.missions[0]

      const tomorrowMissionObject = await getTomorrowMission()
      const tomorrowMission = tomorrowMissionObject.data.missions[0]

      const todayEmbed = new EmbedBuilder()
        .setTitle('오늘의 미션&베테랑')
        .setColor('#86E57F')
        .addFields(
          { name: '베테랑 던전', value: `- ${todayVeteran.dungeon}` }
          , {
            name: '탈틴',
            value: `- ${todayMission.Taillteann.Normal}\n* (PC방) ${todayMission.Taillteann.VIP}`
          }
          , {
            name: '타라',
            value: `- ${todayMission.Tara.Normal}\n* (PC방) ${todayMission.Tara.VIP}`
          }
        )

      const tomorrowEmbed = new EmbedBuilder()
        .setTitle('내일의 미션&베테랑')
        .setColor('#FFBB00')
        .addFields(
          { name: '베테랑 던전', value: `- ${tomorrowVeteran.dungeon}` }
          , {
            name: '탈틴',
            value: `- ${tomorrowMission.Taillteann.Normal}\n* (PC방) ${tomorrowMission.Taillteann.VIP}`
          }
          , {
            name: '타라',
            value: `- ${tomorrowMission.Tara.Normal}\n* (PC방) ${tomorrowMission.Tara.VIP}`
          }
        )
      channel.send({ embeds: [todayEmbed, tomorrowEmbed] })

      channel.send(
        '\n\n=====================================\n아래는 https://quicknews.co.kr/ 에서 가져오는 간추린아침뉴스야!\n\n')

      const getBody = await axios.get('https://quicknews.co.kr/')
      const $ = cheerio.load(getBody.data)
      const content = $('#news_0').text()

      channel.send(content)
      channel.send('오늘도 화이팅!🤩')
    } catch (error) {
      channel.send(basicErrorMessage)
      channel.send(error)

      if (process.env.NODE_ENV === 'production') {
        const otherChannel = client.channels.cache.get(otherChannelId)
        otherChannel.send(basicErrorMessage + '\n' + error)
      }
    }
  })

  console.log('dailyJob start!')
  dailyJob.start()
}
