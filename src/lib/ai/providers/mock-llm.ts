import type { LLMProvider } from "@/types/ai";

const MOCK_RESPONSES = [
  "（轻轻笑了一下）嗯……我听到啦～[SPLIT]不过我现在还在调试中，等我上线了再好好陪你聊天吧！",
  "（歪头看着手机）你说的对呢～[SPLIT]不过我现在只能用模拟回复，等接上真正的AI就能好好聊了！",
  "（伸了个懒腰）啊……今天也是元气满满的一天呢[SPLIT]你说点什么让我开心一下吧～",
  "（揉了揉眼睛）嗯？你找我呀？[SPLIT]我正在等你跟我说话呢～[SPLIT]虽然我现在还只是个模拟版本，但很快就能真正陪你聊天啦！",
  "（凑近屏幕）让我看看你说了什么……[SPLIT]收到啦！等我正式上线，一定给你更好的回复～",
];

export class MockLLMProvider implements LLMProvider {
  async *chat({ messages }: { systemPrompt: string; messages: { role: string; content: string }[]; stream?: boolean }): AsyncGenerator<string> {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const userText = lastUserMsg?.content ?? "";

    let response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];

    if (userText.includes("你好") || userText.includes("嗨") || userText.includes("hi")) {
      response = "（看到消息，嘴角微微上扬）嗯？你来啦～[SPLIT]今天过得怎么样呀？";
    } else if (userText.includes("难过") || userText.includes("伤心") || userText.includes("累")) {
      response = "（放下手里的东西，认真看着你）怎么了？[SPLIT]（轻轻叹气）别一个人扛着，跟我说说吧……";
    } else if (userText.includes("想你") || userText.includes("喜欢")) {
      response = "（耳根微微泛红）……你、你说什么呢[SPLIT]（小声）我也……有一点点想你啦[SPLIT]别多想！";
    }

    const chars = response.split("");
    for (const char of chars) {
      yield char;
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}
