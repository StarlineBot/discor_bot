const cron = require("cron");
const {DateTime} = require("luxon");
const axios = require("axios");
const cheerio = require("cheerio");
const week = ["일", "월", "화", "수", "목", "금", "토"];
const veteran = ["알비", "키아", "라비", "마스", "피오드", "바리", "코일", "룬다", "페카"];

const now = DateTime.now();
const startDate = DateTime.local(2024, 4, 18, 0, 0);

let veteranIndex = 3;
let dungeonList = [{date: startDate, dungeon: veteran[veteranIndex++]}];
for(let i = 1; i < 731; i++) {
  veteranIndex = veteranIndex > 8 ? 0 : veteranIndex;
  let date = startDate.plus({days: i});
  dungeonList.push({
    date: date, dungeon: veteran[veteranIndex]
  });
  veteranIndex++;
}

// 슬래시커맨드를 삭제하고 다시 시작해야 할때
const isDelete = false;

module.exports = async (client) => {
  console.log(`server: ${process.env.NODE_ENV}, ${client.user.tag} is online!`);

  if(isDelete){
    const fetchSlash = await client.application.commands.fetch();
    console.log(fetchSlash);

    await Promise.all(fetchSlash.map(async slash => {
      await client.application.commands.delete(slash.id);
    }));
  }

  const channelId = process.env.NODE_ENV === "development" ? process.env.OTHER_CHANNEL_ID : process.env.CHANNEL_ID;
  const otherChannelId = process.env.OTHER_CHANNEL_ID;
  const basicErrorMessage = "오늘은 섯다라인 휴업중 🫥";
  let eachHoursJob = new cron.CronJob("0 * * * *", function() {
    const channel = client.channels.cache.get(otherChannelId);
    try {
      let now = new Date();
      channel.send(now.getHours() + " / " + now.getMinutes())
    } catch (error) {
      channel.send(basicErrorMessage);
    }
  });

  console.log("eachHoursJob start!")
  eachHoursJob.start();

  // 매일 아침 8시에 필요한 정보들을 가져와 채널로 전송
  let cronSchedule = process.env.NODE_ENV === "development" ? "0 * * * *" : "* 08 * * *";
  let dailyJob = new cron.CronJob(cronSchedule, async function(){

    const channel = client.channels.cache.get(channelId);
    try {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth()+1;
      let day = now.getDate();
      let getWeekDay = week[now.getDay()];

      channel.send("오늘은 " + year + "년 " + month + "월 " + day + "일 " + getWeekDay + "요일, 오늘의 미션과 간추린뉴스 전달해줄게~!😎");
      const todayVeteran = dungeonList.find(({date}) => date.hasSame(now, "day") && date.hasSame(now, "year") && date.hasSame(now, "month"));
      const todayMission = await axios.get("https://mabi.world/missions.php?server=korea&locale=korea&from=" + new Date().toISOString());
      const mission = todayMission.data.missions[0];

      channel.send(`오늘 베테랑 던전은 ${todayVeteran.dungeon}던전이야!\n\n오늘의 미션은~\n\n탈틴\n${mission.Taillteann.Normal}, (PC방) ${mission.Taillteann.VIP}\n\n타라\n${mission.Tara.Normal}, (PC방) ${mission.Tara.VIP}\n\n그럼 오늘도 화이팅!🤩`);

      channel.send("\n\n=====================================\n아래는 https://quicknews.co.kr/ 에서 가져오는 간추린아침뉴스야!\n\n")

      const getBody = await axios.get("https://quicknews.co.kr/");
      const $ = cheerio.load(getBody.data);
      const content = $("#news_0").text();

      channel.send(content);
    } catch(error){
      channel.send(basicErrorMessage);
      channel.send(error);

      if(process.env.NODE_ENV === "production") {
        const otherChannel = client.channels.cache.get(otherChannelId);
        otherChannel.send(basicErrorMessage + "\n" + error);
      }
    }

  });

  console.log("dailyJob start!")
  dailyJob.start();
};