import type { EmotionType, PetActionType } from '@/types';

export type ExpressionContext =
  | 'normal'
  | 'hungry'
  | 'tired'
  | 'bored'
  | 'dirty'
  | 'sick'
  | 'warning';

export interface ActionExpression {
  lines: Partial<Record<ExpressionContext, string[]>>;
  emotion?: Partial<Record<ExpressionContext, EmotionType>>;
  bubbleDurationMs?: Partial<Record<ExpressionContext, number>>;
}

export interface IdleExpressionPack {
  lines: {
    normal: string[];
    morning: string[];
    afternoon: string[];
    evening: string[];
    late: string[];
    hungry: string[];
    tired: string[];
    bored: string[];
    dirty: string[];
  };
}

export interface VoiceExpressionPack {
  listeningHints: string[];
}

export interface PetExpressionPack {
  id: string;
  name: string;
  actions: Record<PetActionType, ActionExpression>;
  idle: IdleExpressionPack;
  voice: VoiceExpressionPack;
}

export const DEFAULT_EXPRESSION_PACK: PetExpressionPack = {
  id: 'default',
  name: '默认表情包',
  actions: {
    feed: {
      lines: {
        normal: ['好耶！开饭啦～', '投喂成功！我超开心', '咔嚓咔嚓…真香'],
        hungry: ['呜呜我都快饿扁了…谢谢你！', '救命饭来了！我太感动了', '我真的好饿…你来得刚刚好'],
        sick: ['我会慢慢吃…谢谢你照顾我', '有点不舒服，但还是想吃一点', '我会乖乖吃的…'],
      },
      emotion: { normal: 'happy', hungry: 'excited', sick: 'sad' },
      bubbleDurationMs: { normal: 4200, hungry: 4800, sick: 5200 },
    },
    play: {
      lines: {
        normal: ['来啦来啦！我们玩起来', '我准备好了！', '嘿嘿，这个我最擅长'],
        bored: ['终于！我快无聊到长蘑菇了', '太好了！我想动一动', '我都等不及啦！'],
        tired: ['我会玩…但可能要慢一点', '我有点累…我们轻轻玩', '我现在只想慢慢动一动…'],
      },
      emotion: { normal: 'excited', bored: 'excited', tired: 'neutral' },
      bubbleDurationMs: { normal: 4200, bored: 4500, tired: 5200 },
    },
    sleep: {
      lines: {
        normal: ['Zzz…我去睡一会儿', '我先眯一下，醒了再陪你', '晚安～'],
        tired: ['我真的好困…谢谢你', '我需要充电…Zzz', '我马上就睡着了…'],
        warning: ['我先休息一下，等会儿再陪你', '有点累了，我去躺一会', '我去补补觉～'],
      },
      emotion: { normal: 'neutral', tired: 'neutral', warning: 'neutral' },
      bubbleDurationMs: { normal: 5200, tired: 5200, warning: 4200 },
    },
    work: {
      lines: {
        normal: ['我去认真一下！', '收到，我开始打工（努力）', '我会加油的！'],
        tired: ['我有点累…但我会尽力', '我先慢慢做…', '我能做一点点…别太苛刻哦'],
      },
      emotion: { normal: 'thinking', tired: 'sad' },
      bubbleDurationMs: { normal: 4200, tired: 5200 },
    },
    transform: {
      lines: {
        normal: ['变身！让我换个样子', '嘿嘿，来点新鲜感', '我准备好了，切换形态～'],
      },
      emotion: { normal: 'surprised' },
      bubbleDurationMs: { normal: 4200 },
    },
    music: {
      lines: {
        normal: ['来点音乐！', '我想听歌～', '播放！我来当 DJ'],
        bored: ['无聊救星：音乐！', '有点闷…来点节奏吧', '我需要一点声音陪伴'],
      },
      emotion: { normal: 'happy', bored: 'neutral' },
      bubbleDurationMs: { normal: 4200, bored: 4200 },
    },
    dance: {
      lines: {
        normal: ['看我跳一段！', '舞台属于我～', '三二一…走你！'],
        tired: ['我跳得慢一点…', '我有点累…但还是想动一动', '轻轻晃一晃也算跳舞嘛'],
      },
      emotion: { normal: 'excited', tired: 'neutral' },
      bubbleDurationMs: { normal: 4200, tired: 5200 },
    },
    magic: {
      lines: {
        normal: ['咒语启动！', '呼——变点小魔法', '嘘…看好了'],
      },
      emotion: { normal: 'surprised' },
      bubbleDurationMs: { normal: 4200 },
    },
    art: {
      lines: {
        normal: ['我来画点什么～', '灵感来了！', '我在认真创作'],
        bored: ['无聊的时候就画画吧', '我想创作点东西', '来点艺术疗愈~'],
      },
      emotion: { normal: 'thinking', bored: 'neutral' },
      bubbleDurationMs: { normal: 5200, bored: 5200 },
    },
    clean: {
      lines: {
        normal: ['洗香香～', '清洁完成！舒服了', '我变得干净啦'],
        dirty: ['呜呜终于…我都要脏成灰了', '谢谢你！我现在好清爽', '我感觉自己亮了一点！'],
        sick: ['慢慢来…我有点不舒服', '谢谢你…我会好一点的', '清洁一下会更舒服…'],
      },
      emotion: { normal: 'happy', dirty: 'excited', sick: 'sad' },
      bubbleDurationMs: { normal: 4200, dirty: 4800, sick: 5200 },
    },
    brush: {
      lines: {
        normal: ['梳毛时间～', '顺顺毛…好舒服', '嘿嘿，变得更可爱了'],
        dirty: ['我这身毛都打结了…救救我', '梳完我就精神了！', '谢谢你…我舒服多了'],
      },
      emotion: { normal: 'happy', dirty: 'neutral' },
      bubbleDurationMs: { normal: 4200, dirty: 5200 },
    },
    rest: {
      lines: {
        normal: ['我先休息一下', '我会乖乖待着陪你', '呼…缓一缓'],
        tired: ['我真的需要休息…', '让我躺一下就好', '我会安静一会儿…'],
        sick: ['我有点难受…我先休息', '我需要你陪陪我…', '我会努力好起来的'],
      },
      emotion: { normal: 'neutral', tired: 'neutral', sick: 'sad' },
      bubbleDurationMs: { normal: 4200, tired: 5200, sick: 5200 },
    },
  },
  idle: {
    lines: {
      normal: ['我在这儿呢~', '嘿嘿，我一直陪着你', '想聊点什么吗？', '我在发呆…但也在等你'],
      morning: ['早呀！今天也要元气满满', '早安~我给你打气！'],
      afternoon: ['下午了，记得喝水哦', '忙的话我就安静陪着你'],
      evening: ['晚上啦，辛苦一天了', '要不要听点音乐放松？'],
      late: ['这么晚还不睡吗…我有点担心你', '夜深了…记得休息哦'],
      hungry: ['肚子咕咕叫了…', '我好像饿了…可以来点苹果吗？', '投喂时间到！'],
      tired: ['我有点困…想眯一会儿', '要不要一起休息一下？', '我需要充电…Zzz'],
      bored: ['我有点无聊…陪我玩一下嘛', '我们来玩个小游戏？', '我想动一动~'],
      dirty: ['我是不是有点脏…', '想洗香香~', '帮我清洁/梳毛一下会很舒服~'],
    },
  },
  voice: {
    listeningHints: ['我在听～', '嗯？我听着呢', '说吧，我在~'],
  },
};

