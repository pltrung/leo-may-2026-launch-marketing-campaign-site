import type { Locale } from "./i18n";

export type Messages = typeof en;

const en = {
  hero: {
    climbTheClouds: "Climb the Clouds.",
    buildACulture: "Build a Culture.",
    scroll: "Scroll",
  },
  cloudSelector: {
    whatTypeOfCloud: "What type of cloud are you?",
  },
  countdown: {
    hi: "Hi",
    youJoined: "You joined",
    powerYourCloud: "Power your cloud",
    logOut: "Log out",
    aboutUs: "About Us",
    yourCloudReveals: "Your cloud reveals its true form.",
    yourCloudGathering: "Your cloud is gathering energy",
    climbersJoined: "climbers joined your cloud",
    inviteOthers: "Invite others to awaken its true form",
    countdownWinnerText:
      "The team with the most climbers when the countdown ends will receive a special prize.",
    linkCopied: "Link copied. Share it to grow your cloud.",
    skyHeader: "The Sky is Shifting",
    skySub: "Which cloud will rise?",
    yourTeamRank: "Your Team Rank",
    toReach3: "to reach #3",
    climber: "climber",
    climbers: "climbers",
  },
  about: {
    title: "About Us",
    paragraphs: [
      "We are a collective of people brought together by a quiet obsession — climbing.",
      "Like any meaningful pursuit, climbing speaks a universal language. It transcends background, culture, and form. It reminds us of something simple, yet often forgotten: connection.",
      "Many of us did not always feel at home in our own bodies.",
      "We grew up under the weight of expectations — told what the body should look like, how it should move, what it should be. We learned to see ourselves through the lens of judgment, measuring our worth against shapes and standards that were never truly ours.",
      "But climbing changed that.",
      "On the wall, there is no perfect body. There is only movement, intention, breath, and presence.",
      "Clouds exist in infinite forms — soft, heavy, scattered, towering — yet each is made of the same elements. None is more \"correct\" than another. Each simply becomes what it is meant to be.",
      "We are no different.",
      "At Leo Mây, we welcome every climber — every shape, every story, every journey. Whether you come seeking strength, peace, joy, or simply curiosity, this is a space where you are free to move as yourself.",
      "Not to become someone else.",
      "But to rediscover who you already are.",
      "We look forward to climbing with you — through every mist, every storm, and every clear sky ahead.",
    ],
  },
};

const vi: Messages = {
  hero: {
    climbTheClouds: "Leo lên những đám mây.",
    buildACulture: "Xây một văn hóa.",
    scroll: "Cuộn",
  },
  cloudSelector: {
    whatTypeOfCloud: "Bạn là kiểu mây nào?",
  },
  countdown: {
    hi: "Chào",
    youJoined: "Bạn đã gia nhập",
    powerYourCloud: "Nuôi mây của bạn",
    logOut: "Đăng xuất",
    aboutUs: "Về chúng tôi",
    yourCloudReveals: "Mây của bạn lộ ra hình thể thật.",
    yourCloudGathering: "Mây của bạn đang tích năng lượng",
    climbersJoined: "người leo đã vào mây của bạn",
    inviteOthers: "Mời thêm người để đánh thức hình thể thật",
    countdownWinnerText:
      "Đội có nhiều người leo nhất khi hết countdown sẽ nhận giải thưởng đặc biệt.",
    linkCopied: "Đã copy link. Chia sẻ để mây lớn mạnh.",
    skyHeader: "Bầu trời đang chuyển",
    skySub: "Mây nào sẽ bay cao?",
    yourTeamRank: "Hạng đội của bạn",
    toReach3: "để lên top 3",
    climber: "người leo",
    climbers: "người leo",
  },
  about: {
    title: "Về chúng tôi",
    paragraphs: [
      "Chúng tôi là một nhóm người gặp nhau bởi một nỗi ám ảnh lặng lẽ — leo núi.",
      "Như mọi đam mê có ý nghĩa, leo núi nói một ngôn ngữ chung. Nó vượt qua xuất thân, văn hóa và hình thể. Nó nhắc ta nhớ điều đơn giản nhưng thường bị lãng quên: kết nối.",
      "Nhiều người trong chúng tôi không phải lúc nào cũng cảm thấy thoải mái trong chính cơ thể mình.",
      "Chúng tôi lớn lên dưới áp lực kỳ vọng — bị bảo cơ thể phải thế nào, phải cử động ra sao, phải trở thành gì. Chúng tôi học cách nhìn bản thân qua lăng kính phán xét, đo giá trị mình bằng những chuẩn hình thể không bao giờ thực sự thuộc về mình.",
      "Nhưng leo núi đã thay đổi điều đó.",
      "Trên tường, không có cơ thể hoàn hảo. Chỉ có chuyển động, ý định, hơi thở và sự hiện diện.",
      "Mây có vô vàn dạng — mềm, nặng, tan, vươn cao — nhưng mỗi đám đều từ cùng những yếu tố. Không dạng nào \"đúng\" hơn. Mỗi đám chỉ đơn giản trở thành đúng với nó.",
      "Chúng ta cũng vậy.",
      "Tại Leo Mây, chúng tôi chào đón mọi người leo — mọi hình thể, mọi câu chuyện, mọi hành trình. Dù bạn tìm sức mạnh, bình yên, niềm vui hay đơn giản là tò mò, đây là nơi bạn được tự do di chuyển đúng con người mình.",
      "Không phải để trở thành ai khác.",
      "Mà để tìm lại con người vốn đã là bạn.",
      "Chúng tôi mong được leo cùng bạn — qua mọi làn sương, mọi cơn giông và mọi bầu trời quang phía trước.",
    ],
  },
};

const messages: Record<Locale, Messages> = { en, vi };

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? en;
}
