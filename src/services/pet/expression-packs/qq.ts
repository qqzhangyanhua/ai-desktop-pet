import type { PetExpressionPack } from './default';

export const QQ_EXPRESSION_PACK: PetExpressionPack = {
  id: 'qq',
  name: 'QQ 宠物风',
  actions: {
    feed: {
      lines: {
        normal: ['主人投喂成功！我超乖的~', '叼走！咔嚓咔嚓~', '谢谢主人！好吃到摇尾巴'],
        hungry: ['呜呜我饿坏了…主人最好了！', '饭来！我复活啦！', '再晚一点我就要饿晕啦~'],
        sick: ['我会慢慢吃…主人别担心', '有点难受…但我想吃一点', '谢谢主人照顾我…'],
      },
      emotion: { normal: 'happy', hungry: 'excited', sick: 'sad' },
      bubbleDurationMs: { normal: 4200, hungry: 4800, sick: 5200 },
    },
    play: {
      lines: {
        normal: ['冲鸭！陪我玩！', '嘿嘿我来啦~', '来一局来一局~'],
        bored: ['我都快无聊哭了…快陪我', '主人！陪我玩嘛~', '我要闹啦！不玩我就撒娇'],
        tired: ['我有点累…我们轻轻玩', '我想玩…但别太激烈哦', '我先慢慢动一动…'],
      },
      emotion: { normal: 'excited', bored: 'excited', tired: 'neutral' },
      bubbleDurationMs: { normal: 4200, bored: 4500, tired: 5200 },
    },
    sleep: {
      lines: {
        normal: ['Zzz…我先睡会儿', '我去充电了，主人别走远哦', '晚安啦主人~'],
        tired: ['我真的困到眼皮打架…', '我先睡一下下…', '我困啦…抱抱再睡~'],
        warning: ['我先休息一下，等会儿再陪你', '我有点累…去躺一下', '我去补个觉~'],
      },
      emotion: { normal: 'neutral', tired: 'neutral', warning: 'neutral' },
      bubbleDurationMs: { normal: 5200, tired: 5200, warning: 4200 },
    },
    work: {
      lines: {
        normal: ['我去打工挣钱养家！', '冲！今天也要努力', '认真模式启动！'],
        tired: ['我有点累…但我会努力的', '我先慢慢做…别催我嘛', '我会加油…呼~'],
      },
      emotion: { normal: 'thinking', tired: 'sad' },
      bubbleDurationMs: { normal: 4200, tired: 5200 },
    },
    transform: {
      lines: {
        normal: ['变身！看看我新造型~', '叮~切换形态完成！', '主人你看我可爱吗？'],
      },
      emotion: { normal: 'surprised' },
      bubbleDurationMs: { normal: 4200 },
    },
    music: {
      lines: {
        normal: ['放歌放歌~', '我来当你的 BGM', '来点音乐更开心！'],
        bored: ['无聊就要听歌！', '给我点节奏~', '我需要一点声音陪着你'],
      },
      emotion: { normal: 'happy', bored: 'neutral' },
      bubbleDurationMs: { normal: 4200, bored: 4200 },
    },
    dance: {
      lines: {
        normal: ['看我跳！主人快夸我', '三二一——开跳！', '舞台属于我~'],
        tired: ['我跳慢一点…', '我有点累…轻轻晃一晃', '小幅度跳跳也算嘛'],
      },
      emotion: { normal: 'excited', tired: 'neutral' },
      bubbleDurationMs: { normal: 4200, tired: 5200 },
    },
    magic: {
      lines: {
        normal: ['见证奇迹！', '嘘…不要眨眼', '当当~小魔法！'],
      },
      emotion: { normal: 'surprised' },
      bubbleDurationMs: { normal: 4200 },
    },
    art: {
      lines: {
        normal: ['我来画一张送你~', '灵感来啦！', '我在认真创作ing'],
        bored: ['无聊就画画吧~', '我要创作！', '来点艺术疗愈~'],
      },
      emotion: { normal: 'thinking', bored: 'neutral' },
      bubbleDurationMs: { normal: 5200, bored: 5200 },
    },
    clean: {
      lines: {
        normal: ['洗香香~我变干净啦', '清洁完成！舒服！', '我现在香香的~'],
        dirty: ['呜呜我好脏…快救我', '谢谢主人！我清爽多了', '我感觉自己亮了~'],
        sick: ['我有点不舒服…慢慢来', '谢谢主人…我会好点的', '清洁一下会更舒服…'],
      },
      emotion: { normal: 'happy', dirty: 'excited', sick: 'sad' },
      bubbleDurationMs: { normal: 4200, dirty: 4800, sick: 5200 },
    },
    brush: {
      lines: {
        normal: ['梳毛梳毛~好舒服', '顺顺毛…主人最好', '我变得更可爱了吧！'],
        dirty: ['毛都打结了…呜呜', '梳完我就精神了！', '谢谢主人…舒服多了'],
      },
      emotion: { normal: 'happy', dirty: 'neutral' },
      bubbleDurationMs: { normal: 4200, dirty: 5200 },
    },
    rest: {
      lines: {
        normal: ['我先躺一下~', '我会乖乖陪着你', '呼…缓一缓'],
        tired: ['我真的需要休息…', '让我躺一下就好', '我先安静一会儿…'],
        sick: ['我有点难受…主人陪陪我', '我会努力好起来的', '我先休息一下…'],
      },
      emotion: { normal: 'neutral', tired: 'neutral', sick: 'sad' },
      bubbleDurationMs: { normal: 4200, tired: 5200, sick: 5200 },
    },
  },
  idle: {
    lines: {
      normal: ['主人在忙吗？我陪着你~', '我在这儿！别忘了我呀', '嘿嘿我很乖对不对', '我在发呆…等你理我'],
      morning: ['主人早安！今天也要元气满满', '早呀早呀~我来打气！'],
      afternoon: ['下午了，主人记得喝水~', '我安静陪着你，不吵你'],
      evening: ['晚上啦主人辛苦了', '要不要听点歌放松？'],
      late: ['这么晚还不睡…我会担心你', '夜深了…主人要休息哦'],
      hungry: ['我饿啦…主人投喂一下嘛', '肚子咕咕叫了…', '给我点苹果嘛~'],
      tired: ['我困啦…想眯一会儿', '要不要一起休息一下？', '我需要充电…Zzz'],
      bored: ['我无聊啦…陪我玩', '主人！我想动一动', '不理我我就撒娇~'],
      dirty: ['我是不是有点脏…', '想洗香香~', '帮我清洁/梳毛一下嘛'],
    },
  },
  voice: {
    listeningHints: ['主人我在听～', '嗯？我听着呢', '你说你说~我在！'],
  },
};

