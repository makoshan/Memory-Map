# Memory Map 调研总结：World Model、Agent Memory 与 AI 办公室

日期：2026-05-10

## 1. 核心结论

Memory Map 的核心不应是“AI 地图 + 游戏化”，而应是一个会持续学习的个人世界模型：

> 真实生活证据 -> 可回溯语义压缩 -> 行动机会 -> 人类可读工作台 -> Godot 世界反馈 -> 用户修正 -> 持续学习。

当前调研支持三个判断：

1. **World model 是对环境的可用压缩，不是原始数据堆积。**
   对 Memory Map 来说，原始照片、GPS、笔记和音频应保存为证据；`EventMeaning`、`PlaceProfile` 和 `world_state` 是对证据的可解释压缩。这个压缩不是普通摘要，而是必须保留预测与行动价值的地点状态模型。

2. **持续学习的 MVP 不应依赖微调模型，而应依赖记忆、反思、技能和反馈治理。**
   这条路线更便宜、更隐私友好、更可控，也更符合个人产品的早期验证。

3. **Godot 世界与 GUI 办公室是同一个 Personal World Model 的两种 UI。**
   Godot 负责把稳定后的世界状态变成沉浸式、空间化、情绪化表达；GUI 办公室负责让用户审查、校正、调参和批准 AI 的判断。HTML 是当前最适合承载工作台的一种技术媒介，不是产品层本身。

### 1.1 逻辑审计：站得住脚，但要降维表述

这条产品逻辑是站得住脚的，但最稳的表述不是“我们要做一个真正的 AI world simulator”，而是：

> Memory Map 是一个本地优先的个人世界状态系统：它把生活证据压缩成可解释、可修改、可行动的地点模型，再用办公室工作台和 Godot 世界把同一个模型反馈给用户。

换句话说，`world model` 在这里是产品架构概念，不是声明已经训练出像 Genie、Sora 或 V-JEPA 那样的基础世界模型。Memory Map 的早期差异化不在“生成世界物理规律”，而在“把用户生活压缩成可被 agent 使用、可被用户审计、可反馈学习的世界状态”。

| 论点 | 当前支撑 | 容易被质疑的地方 | 更严谨的说法 |
| --- | --- | --- | --- |
| 个人生活需要 world model | World Models、MuZero、DreamerV3 都说明 agent 需要压缩状态来规划 | 这些工作多在游戏/RL环境，不直接等价于个人数据产品 | 借鉴的是“可用于预测和行动的状态表示”，不是复刻其训练范式 |
| 地图/空间是好的记忆 UI | 认知地图研究支持空间、地标和路线对记忆与规划有帮助 | 不能由此推出所有人生数据都应游戏化 | 空间层适合表达长期状态和回忆锚点，审查仍应放在 GUI 工作台 |
| Agent memory 可替代早期微调 | Reflexion、Voyager、MemGPT、2026 memory survey 支持外部记忆/反思/技能路线 | 外部记忆不是自动等于持续学习，可能变成乱写日志 | 必须有 write/manage/read、冲突处理、遗忘、用户批准和评估闭环 |
| HTML/办公室适合做人类反馈层 | Artifacts、Harness engineering、OSWorld 都指向可读环境和工具化工作台的重要性 | HTML 只是媒介，不是护城河 | 护城河是可解释证据链、反馈治理和个人语义对象，HTML 只是实现选择 |
| Godot 世界能增强产品感 | 交互世界能把状态变成可感知反馈 | 如果没有可解释来源，会像装饰或手游皮肤 | Godot 只消费稳定语义，不直接决定事实；每次变化都能回溯 |

因此，Memory Map 的逻辑强度来自四个闭环是否真实存在：

```text
证据闭环：原始媒体 / GPS / 笔记 / 音频 -> 语义对象 -> 可回溯证据
行动闭环：PlaceProfile -> Opportunity -> 用户接受/忽略/完成
反馈闭环：用户纠正 -> Reflection / Skill / Preference -> 后续判断改变
表达闭环：稳定语义 -> Godot 世界变化 -> GUI 解释页 -> 用户批准或修正
```

如果只做到“导入照片后地图上长出漂亮建筑”，这个想法站不稳；如果做到“每个建筑变化都能解释、纠正后会改变后续建议、agent 能把反馈变成可复用技能”，它就有清晰的产品和技术逻辑。

## 2. 理论依据

### 2.1 World model：压缩、想象与规划

[Ha & Schmidhuber, World Models](https://arxiv.org/abs/1803.10122) 证明了一个 agent 可以先学习环境的压缩时空表示，再在内部模型中“想象”未来并学习策略。它的启发不是“丢掉原始数据”，而是：

- 原始观察太大、太碎，不能直接作为行动系统。
- 需要一个压缩后的状态表示，供 agent 判断“现在在哪里”和“下一步会怎样”。
- 好的 world model 不只是回忆过去，还支持预测和规划。

对 Memory Map 的映射：

```text
Raw Signals
照片 / GPS / 笔记 / 打卡 / 音频 / 健康数据

-> EventMeaning
发生了什么、在哪里、为什么重要

-> PlaceProfile / Personal World State
这个地点在用户生活模型中的状态、倾向、记忆密度、情绪模式、社交模式和时间模式

-> Opportunity
基于地点状态生成的行动假设：值得做什么、避开什么、何时重访、如何调整路线或策略
```

更精确地说，`EventMeaning` 和 `PlaceProfile` 是 world model 的状态压缩；`Opportunity` 更接近 Ha & Schmidhuber 框架里的 controller / policy 输出，不是 world model 本体。

因此 `PlaceProfile` 不应该只回答“这个地方是什么”，还应该能支持这些问题：

- 如果用户在某个时间、某种心境、某个目标下靠近这里，可能会发生什么？
- 这个地点可能带来什么机会、风险、回忆、关系或行动？
- 这个地点适合今天重访、避开、记录、休息、工作，还是转化成一个项目节点？

更严谨的产品定义：

> Memory Map 的 world model 层不是原始轨迹库，而是从照片、GPS、文本和行为中压缩出可预测、可行动的地点状态；agent 使用这些地点状态来想象未来路线、重访机会和生活策略。

### 2.2 不要 summary-only：压缩上下文，但保留证据

[Memex(RL)](https://arxiv.org/abs/2603.04257) 指出，单纯用摘要压缩历史会丢失证据；更好的方法是保留索引，让 agent 在需要时回到完整证据。

对 Memory Map 的设计约束：

```text
原始证据本地保存
-> 结构化摘要进入 Personal World Model
-> 每个模型判断都能回溯到原始照片、GPS、笔记或音频 transcript
```

这支持现有的 SQLite、本地媒体文件、`world_sync_evidence` 和隐私边界设计。

### 2.3 LLM 会形成部分世界表示，但产品里仍要显式建模

[Emergent World Representations / Othello-GPT](https://arxiv.org/abs/2210.13382) 显示，序列模型可以从棋步中学出棋盘状态；[Language Models Represent Space and Time](https://arxiv.org/abs/2310.02207) 发现 LLM 内部存在空间和时间表示。

启发：

- 语言可以压缩世界，LLM 可以帮助抽取意义。
- 但用户生活的 world model 不能只藏在 LLM 权重或 prompt 里。
- Memory Map 应把关键状态显式存成结构化对象，便于解释、审计、修正和渲染。

### 2.4 Language / Symbol：世界模型的脚手架

补充访谈材料里有一个关键判断：这一代 agent 之所以应该叫 language agent，不是因为它只会自然语言，而是因为 language 成为 perception、reasoning、action 和 memory 的共同脚手架。这里的 language 应该按广义理解：自然语言、编程语言、图表、手势、界面布局、工作流命名、房间和路径，都可以是符号化表达。

Terrence W. Deacon 的 *The Symbolic Species: The Co-evolution of Language and the Brain* 也支持这个方向。书中把 language 放在 symbolic reference 和 combinatorial rules 的框架里理解，而不是只看语音或文字。核心启发是：人类不是先有一个孤立的大脑再发明语言，而是在符号表达、社会传递和脑演化之间形成了共同进化。符号让信息跨越空间、时间和代际传递，也给大脑和社会带来新的选择压力。

对 Memory Map 的启发：

- `EventMeaning` 不是普通摘要，而是把一次经历变成可以被组合、检索和行动的符号句柄。
- `PlaceProfile` 不只是统计画像，而是一个地点在用户生活世界中的符号化状态。
- `Opportunity` 是在这些符号化状态上生成的行动策略。
- Godot 世界和 GUI 办公室都是符号系统：建筑、房间、路径、灯光、卡片、按钮和解释页都在帮助用户理解并修正世界模型。
- Coding 是 digital world 的 formal language，GUI 是人类可读的 symbolic surface。Memory Map 不应在 GUI 和 code 之间二选一，而应让 GUI 的操作结果落回结构化对象和可执行技能。

因此，Memory Map 的 Layer 1 应该被理解为：

```text
生活证据
-> 符号化事件 EventMeaning
-> 可预测地点状态 PlaceProfile
-> 可执行策略 Opportunity / Skill
-> Godot 与 GUI 的双重表达
```

这也解释了为什么“语言即世界”这类命题对产品有用：语言不是世界本身，但它是让世界可共享、可压缩、可修正、可行动的脚手架。

### 2.5 Interactive world model：世界应该可行动

DeepMind 的 [Genie](https://arxiv.org/abs/2402.15391) 与 [Genie 2](https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/) 把 world model 推向 action-controllable / playable environments；OpenAI 的 [Sora world simulator report](https://openai.com/index/video-generation-models-as-world-simulators/) 把大规模视频生成视作通往物理世界模拟器的路径；Meta 的 [V-JEPA 2](https://ai.meta.com/blog/v-jepa-2-world-model-benchmarks/) 明确把 world model 拆成理解、预测、规划。

对 Memory Map 的启发：

- Godot 世界不是装饰，而是用户可进入、可观察、可操作的 world model UI。
- 用户点击、进入房间、接受任务、忽略机会，都是对模型的行动反馈。
- 世界变化必须能解释来源，否则用户会把它当作无意义的视觉效果。

### 2.6 Cognitive map：空间不是噱头，而是记忆与规划的界面

神经科学里的 cognitive map 研究为 Memory Map 的空间界面提供了更接地气的支撑。[The cognitive map in humans](https://www.nature.com/articles/nn.4656) 回顾了人类如何用空间编码、地标锚定和路线规划来组织导航；[From cognitive maps to spatial schemas](https://www.nature.com/articles/s41583-022-00655-9) 进一步把空间图式、事件图式和经验模式连接起来。

对 Memory Map 的启发比“做成地图更好看”更强：

- 地点不是普通标签，而是生活记忆的索引。
- 路线、房间、建筑和地标可以帮助用户理解长期状态变化。
- 空间表达适合做“我生活中的模式在哪里发生”的外部化认知工具。

但这也限定了边界：空间层只适合表达稳定模式、重要记忆和行动路径，不适合承载全部审查、调参和冲突处理。复杂判断仍应回到 GUI 办公室。

### 2.7 Thousand Brains：reference frames 与多模型共识

Jeff Hawkins 的 *A Thousand Brains* 给 Memory Map 另一个很有用的产品隐喻：大脑里的世界模型不是一堆孤立事实，而是由许多 map-like reference frames 组织起来的结构。reference frame 的价值在于，它不仅记录“有什么”，还记录事物之间的相对关系、可达路径、可预期变化和目标导向动作。

这和 Memory Map 的 `PlaceProfile` 很接近。一个地点画像不应该只是：

```text
地点名 + 标签 + 到访次数 + 平均情绪
```

而应该更像一个个人生活参考框架：

```text
这个地点和哪些人、时间、情绪、任务、路线、回忆相连？
靠近这里时，用户通常会进入什么状态？
这里支持什么行动，阻碍什么行动？
哪些预测可靠，哪些只是 agent 的临时猜测？
```

*A Thousand Brains* 里的另一个关键启发是“多个局部模型形成共识”。每个 cortical column 可以维护一个局部模型，感知不是单点判断，而是多个模型之间的投票、校正和收敛。映射到 Memory Map：

- `PlaceProfile`、`Reflection`、`Skill`、`ModelClaim` 都应该被看成局部信念，而不是最终真相。
- GUI 办公室应该暴露这些信念的证据、置信度、冲突和待确认状态，让用户参与“投票”和校正。
- Godot 世界只表达已经足够稳定的共识状态，避免把低置信度猜测直接变成沉浸式现实。
- `WorkbenchArtifact` 的意义不只是报告，而是把 agent 的局部世界模型做成人类可审计的 reference frame。

因此，Memory Map 的数据结构需要保留两类东西：一类是地点内部的预测结构，另一类是不同信念之间的治理结构。前者让系统能想象未来路线和机会，后者让用户能快速看懂、纠正并批准这些想象。

## 3. Agent Memory 与持续学习

### 3.1 经典 agent memory 架构

几篇关键工作给 Memory Map 的持续学习提供了明确参考：

- [Generative Agents](https://arxiv.org/abs/2304.03442)：observation、memory、reflection、planning 让 agent 从经验中产生可信行为。
- [Reflexion](https://arxiv.org/abs/2303.11366)：用语言反馈让 agent 从失败中改进，不需要更新模型权重。
- [Voyager](https://arxiv.org/abs/2305.16291)：自动课程、技能库、环境反馈，形成 LLM agent 的终身学习。
- [MemGPT](https://arxiv.org/abs/2310.08560)：把长记忆做成类似操作系统的分层上下文管理。
- [Memory for Autonomous LLM Agents, 2026 survey](https://arxiv.org/abs/2603.07670)：将 agent memory 形式化为 `write -> manage -> read` loop，并强调写入过滤、矛盾处理、隐私治理、可信反思和选择性遗忘。

### 3.2 对 Memory Map 的持续学习定义

MVP 不需要训练私人模型。更合适的是非参数持续学习：

```text
结构化记忆
+ 反思摘要
+ 用户反馈
+ 可执行技能
+ 置信度与证据链
+ 可回溯索引
```

这意味着学习对象不是模型参数，而是这些外部状态：

| 类型 | Memory Map 对象 | 作用 |
| --- | --- | --- |
| Episodic memory | `EventMeaning` | 记录一次发生过的生活事件 |
| Semantic memory | `PlaceProfile` / 用户偏好 / 项目画像 | 压缩长期模式，并支持预测与行动判断 |
| Procedural memory | `Skill` | 记录“以后遇到这种情况怎么做” |
| Reflective memory | `Reflection` | 从反馈中总结规则 |
| Feedback memory | `FeedbackEvent` | 用户接受、忽略、纠正、完成的信号 |

### 3.3 持续学习闭环

```text
Observe
导入照片、笔记、音频、GPS、健康数据

-> Write
生成 MediaAsset、EventMeaning、证据索引

-> Manage
合并、去重、置信度更新、冲突处理、遗忘或降权

-> Read
为 Assistant / Analyst / Researcher 检索相关上下文

-> Act
生成 Opportunity、今日任务、世界变化

-> Human Feedback
用户确认、纠正、忽略、完成、调参

-> Consolidate
更新 PlaceProfile、Reflection、Skill、Preference

-> Render
Godot 世界和 GUI 办公室同步变化
```

### 3.4 Micro-world specialization：学习目标是用户的小世界

补充访谈材料里最值得放进 Memory Map 的一句判断是：世界不是一个世界，而是由几百万个小世界组成。每个职业、公司、软件、地点、关系网络、项目阶段，都是一个 entropy 很高的 micro-world。通用模型已经足够强，但真正产生价值的是 specialization：agent 要学会某个小世界的组织结构、隐性规则、工作流、风险点、谁说了算、什么动作会产生什么结果。

这直接对应 Memory Map：

- 用户不是要一个通用地图 agent，而是要一个逐渐理解“我的生活小世界”的 agent。
- `PlaceProfile` 是 micro-world 的局部模型：这个地点有什么角色、节奏、关系、机会、风险和历史。
- `Reflection` 是从用户反馈里抽出的局部规律。
- `Skill` 是把局部规律变成可复用程序性记忆。
- `FeedbackEvent` 是 deployment learning signal。真实使用中的确认、纠正、忽略、完成，比离线 prompt 更接近 agent 持续学习需要的信号。

因此，持续学习不应被理解成“记住更多材料”，而应被定义为：

> 从真实部署和用户反馈中，持续学习用户生活 micro-world 的世界模型，并把它压缩成可解释状态、可执行技能和更可靠的下一步建议。

这也解释了为什么 Memory Map 必须有 GUI 办公室：没有审查和反馈入口，deployment 只会产生更多日志，不会产生高质量学习信号。

## 4. GUI 办公室与 Godot 世界的分工

### 4.1 HTML 的启发与边界

[The Unreasonable Effectiveness of HTML examples](https://thariqs.github.io/html-effectiveness/) 提出，HTML 比 Markdown 更适合承载复杂计划、报告、图表、对比、交互编辑器和可分享 artifact。Claude 的 [Artifacts 文档](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them) 也把 single-page HTML、AI-powered artifacts、MCP integration 和 persistent storage 放进 artifact 范畴。

OpenAI 的 [Harness engineering](https://openai.com/index/harness-engineering/) 强调，在 agent-first 工作流中，人类工作会转向搭建系统、脚手架和可读性。关键不是让人检查每一行输出，而是让环境、日志、UI、指标对人和 agent 都 legible。

对 Memory Map 的判断：

> HTML 不是学习本身，也不是产品层本身，而是 GUI 办公室里很适合承载高质量反馈的技术媒介。

用户在 GUI 办公室中的操作会产生 learning signal：

- 确认：这个地点确实是恢复区。
- 纠正：这不是工作事件，是展会学习。
- 忽略：这个机会不重要。
- 合并：这 3 个事件属于同一个项目。
- 调参：机会提醒频率降低。
- 批准：这条反思可以写入长期记忆。

### 4.2 Godot 与 GUI 办公室的职责边界

| 层 | 作用 | 用户感受 |
| --- | --- | --- |
| Godot 世界 | 长期状态、空间记忆、情绪表达、沉浸体验 | “我的生活正在长成一个世界” |
| GUI 办公室 / Human-Readable Workbench | 分析、审查、调参、对比、批准、导出 | “我能看懂 AI 为什么这样判断，并能改它” |

一句话：

> Godot 世界负责把 Personal World Model 变成可进入、可感知、可沉浸的空间；GUI 办公室负责把同一个模型变成可检查、可修正、可批准的工作台。

更产品化地说：

> Godot 是“我相信我的生活正在变成什么”的世界表达；GUI 办公室是“我为什么这样相信，以及我要不要修正它”的控制台。

技术上，两者都可能运行在 Web/HTML 环境中：当前 Godot 可以作为 HTML5/Web 游戏嵌入，React/Tauri 的 GUI 也由 HTML/CSS/JS 承载。但产品职责不同，不能把 HTML 等同于 GUI 办公室，也不能把 Godot Web 输出等同于审计工作台。

### 4.3 AI 办公室：不是“聊天入口”，而是 agent legibility 层

AI 办公室最值得保留的逻辑不是“办公室里有几个 AI 员工”，而是它给 agent 和用户提供同一套可读工作环境。OpenAI 的 Harness engineering 明确提出，agent-first 工作流的关键是把 UI、日志、指标、文档和计划做成 agent 可理解的环境；OSWorld 也显示，真实电脑任务的困难不只在模型推理，还在 GUI grounding、操作知识和跨应用流程。

因此 Memory Map 的办公室应该承担三件事：

1. **可读性。** 把 `EventMeaning`、`PlaceProfile`、`Opportunity`、`FeedbackEvent`、`Reflection` 和 `Skill` 变成用户能看懂、agent 能检索的工作对象。
2. **可控性。** 用户可以确认、纠正、合并、拒绝、降权、批准，而不是只能接受 AI 结论。
3. **可评估性。** 每个 AI 员工的输出都应该能绑定证据、状态、下一步动作和结果反馈。

这会把“一个人的 AI 公司”从拟人化包装拉回到真正的产品架构：办公室不是角色扮演，而是个人 agent 的 control room。AI 员工可以是视觉隐喻，但底层必须是明确的任务队列、证据链、反馈记录和技能库。

### 4.4 GUI 不会消失：视觉界面本身编码了知识

补充访谈材料对 GUI / CLI 的判断也很适合 Memory Map：GUI 不只是给人点按钮，它本身编码了长期积累的知识、约束、业务逻辑和验证路径。人是视觉动物，复杂关系往往用二维或空间表达更高效；agent 即使最终能调用 API 和 CLI，也仍然需要理解 GUI，因为大量长尾场景只以 GUI 形式存在。

对 Memory Map 的含义：

- Godot 世界不是“用游戏替代数据表”，而是用空间、地标、路径和状态动画表达长期模式。
- GUI 办公室不是“比 CLI 低级”，而是把证据链、置信度、反馈动作和技能管理放到人能快速审查的界面里。
- HTML/React 工作台适合承载审计和修正，因为它能把表格、图、卡片、拖拽、按钮、代码片段和复制导出放在同一个可读 artifact 中。
- 未来即使 agent 能自动执行更多操作，GUI 办公室仍然需要保留 validation、trust、auditing 和 learning signal 捕获功能。

更短地说：

> CLI/API 适合机器执行，GUI/Godot 适合人类理解，二者的共同底层应该是结构化 world model。

## 5. 建议新增产品层：Human-Readable Workbench

建议在 Layer 1 与 Godot Layer 3 之间加入一层：

```text
Layer 2.5：Human-Readable Workbench
```

它不替代 Godot，也不替代 Hermes，而是把 AI 的判断变成可读、可点、可改、可批准的 HTML artifacts。

更准确地说，`Human-Readable Workbench` 是 GUI 办公室的核心产品层；HTML artifact 是它当前最合适的实现形式之一。

推荐 artifact：

```text
place-inspector.html
opportunity-board.html
memory-review.html
skill-workshop.html
world-sync-preview.html
weekly-life-report.html
agent-tuner.html
```

### 5.1 Place Inspector

用途：解释某个地点为什么变大、变亮、变暗或变成某种角色。

内容：

- 地点角色：home / work / recovery / memory / project。
- 证据链：照片、GPS、笔记、音频 transcript、访问次数。
- 置信度：location、address、visual、note、overall。
- 用户操作：确认、改角色、合并地点、标记误判。

### 5.2 Opportunity Board

用途：把机会变成可管理的行动假设。

内容：

- Now / Next / Later / Ignore 四列。
- 每张卡片显示来源证据、预期影响、置信度、今日任务。
- 用户拖拽后的结果写回 `Opportunity.status` 和 `FeedbackEvent`。

### 5.3 Memory Review Desk

用途：每天让用户批准“AI 想记住什么”。

内容：

- 新增记忆。
- 待合并记忆。
- 可能过期或冲突的记忆。
- 用户可以批准、删除、改写。

### 5.4 Skill Workshop

用途：把重复成功的行动模式沉淀成个人技能。

示例：

- 展会照片导入后，自动生成项目复盘。
- 连续高负荷外出后，第二天减少高认知任务。
- 某地点出现工作标签三次后，自动建议生成项目房间。

### 5.5 Godot Sync Preview

用途：在同步 Godot 前审查 `world_state.json`。

内容：

- 节点变化。
- 建筑等级变化。
- 植被、亮度、雾、水位变化。
- 解锁原因。
- “批准同步到 Godot”按钮。

## 6. 推荐数据对象

### 6.1 FeedbackEvent

```ts
type FeedbackEvent = {
  id: string
  target_type: "event_meaning" | "place_profile" | "opportunity" | "reflection" | "skill" | "world_node"
  target_id: string
  action: "confirm" | "correct" | "dismiss" | "merge" | "split" | "accept" | "complete" | "snooze" | "tune"
  user_note?: string
  before_json?: string
  after_json?: string
  created_at: string
}
```

### 6.2 Reflection

```ts
type Reflection = {
  id: string
  scope: "place" | "project" | "user" | "agent" | "skill"
  source_event_ids: string[]
  source_feedback_ids: string[]
  summary: string
  confidence: number
  status: "draft" | "approved" | "rejected" | "superseded"
  created_at: string
}
```

### 6.3 Skill

```ts
type Skill = {
  id: string
  title: string
  trigger: string
  procedure: string
  source_reflection_ids: string[]
  success_count: number
  failure_count: number
  status: "draft" | "active" | "paused" | "retired"
  created_at: string
  updated_at: string
}
```

## 7. 产品原则

1. **证据不丢失。**
   原始媒体和硬事实留在本地；语义层只保存摘要、索引、置信度和证据链。

2. **每个世界变化都能解释。**
   建筑变大、植被增加、雾变重、路径解锁，都必须能点开看到原因。

3. **GUI 办公室负责审查，Godot 世界负责体验。**
   不要把所有分析塞进游戏 UI，也不要让 GUI 工作台替代沉浸式世界。HTML 是 GUI 办公室的实现媒介之一，不是产品职责本身。

4. **学习必须经过反馈治理。**
   AI 不能悄悄把所有推断写进长期记忆；高影响记忆和技能需要用户批准。

5. **Opportunity 是 controller / policy 输出，不是 world model 本体，也不是广告推荐。**
   每个机会必须基于 `EventMeaning` 和 `PlaceProfile`，并包含证据、置信度、预期影响和可执行下一步。

6. **MVP 用非参数学习。**
   先做 SQLite、结构化对象、反思摘要、技能文件、反馈事件；不做私人模型训练。

7. **稳定语义才进入 Godot。**
   单张图片只生成 `EventMeaning`；达到阈值后再更新 `PlaceProfile` 和 `world_state`。

8. **符号句柄优先于长文本总结。**
   `EventMeaning`、`PlaceProfile`、`Opportunity`、`Reflection` 和 `Skill` 都应该是可组合、可检索、可回溯、可行动的 symbolic handles，而不是只给人读的散文摘要。

9. **真实部署反馈优先于离线想象。**
   用户在 GUI 办公室和 Godot 世界里的确认、纠正、忽略、完成，是最重要的 learning signal。没有反馈回写，agent 只是在生成内容；有反馈治理，agent 才开始学习用户的小世界。

## 8. 建议 MVP 增量

在现有 `product.md` 基础上，建议增加三个 MVP 验证点：

1. 用户能点开一个 Godot 世界变化，并看到 GUI 办公室中的解释页。
2. 用户能在 GUI 工作台里纠正一次 AI 判断，系统第二天不再重复同类错误。
3. 用户能批准一条 Reflection 或 Skill，并在后续 Opportunity 中看到它被使用。

对应的最小闭环：

```text
导入 10 张同地点图片
-> 生成 EventMeaning
-> 达到阈值生成 PlaceProfile
-> HTML Place Inspector 显示证据链
-> 用户确认地点角色
-> export_world_state
-> Godot 世界节点升级
-> Opportunity Board 生成一个今日任务
-> 用户接受或忽略
-> FeedbackEvent 写回
```

### 8.1 可证伪的 MVP 验证问题

为了避免概念过大，下一版 MVP 应该把“逻辑是否成立”压成可测试问题：

| 假设 | 最小测试 | 成立信号 | 不成立信号 |
| --- | --- | --- | --- |
| 用户愿意把生活材料导入成世界状态 | 连续导入一组同地点照片/笔记 | 用户能理解事件、地点和世界变化的关系 | 用户只把它当相册或觉得解释多余 |
| 可解释工作台提升信任 | Place Inspector 展示证据链和置信度 | 用户能指出并修正 AI 判断 | 用户看不懂或懒得审查 |
| 反馈能产生持续学习感 | 用户纠正一次地点角色或机会类型 | 后续相似输入不再重复错误 | 系统表现和纠正前无差别 |
| Godot 世界不是装饰 | 世界节点变化可点击回到解释页 | 用户愿意从世界进入工作台 | 用户只看一次视觉效果后不再使用 |
| Opportunity 能回答“今天该干嘛” | 从 PlaceProfile 生成 1-3 个今日任务 | 用户接受、延后或完成至少一个 | 建议像泛泛的待办或推荐广告 |

这些验证比“画面是否好看”更重要。画面负责让人愿意进入系统，闭环负责让人愿意留下。

### 8.2 当前实现与下一步缺口

当前代码已经有一条可证明的骨架：

- `EventRecord`、`MediaAsset`、`PlaceProfile`、`WorldNode`、`Opportunity` 和 `AgentContextSnapshot` 已经形成从事件到世界状态的类型链。
- `worldEngine.ts` 已经能把地点事件压缩成角色、权重、风险、亮度、植被、水位、雾、解锁原因和机会。
- Hermes 图片意义请求已经强调只返回结构化语义，并避免发明不可见的私人事实。
- Godot 只读取导出的 `world_state.json`，这符合“稳定语义才进入 Layer 3”的边界。

最关键的缺口不是再做更多页面，而是补上学习闭环：

1. `FeedbackEvent` 还没有成为一等对象。
2. `Reflection` 和 `Skill` 还停留在研究设计中，没有写入、批准、读取路径。
3. `Opportunity.status` 有类型定义，但用户动作还没有真正驱动后续策略变化。
4. Place Inspector / Godot Sync Preview 还没有承担“解释世界变化”的审查入口。
5. 符号化句柄还不够明确：当前 `summary`、`tags`、`unlockReason` 已经有雏形，但还需要让地点、机会、技能都能被 agent 稳定引用和组合。

下一步最小可行实现应该是：

```text
PlaceProfile 解释页
-> 用户确认/纠正地点角色
-> 写入 FeedbackEvent
-> 生成一条 draft Reflection
-> 用户批准
-> 后续同类 EventMeaning 读取这条 Reflection
-> Opportunity 和 world_state 改变
```

做到这一步，Memory Map 才从“语义地图 + 游戏 UI”跨到“会学习的个人世界模型”。

### 8.3 不要过度宣称

为了让外部叙事更稳，建议避免这些说法：

- 不说“Memory Map 训练了一个个人基础世界模型”，改说“Memory Map 维护一个可解释的个人世界状态”。
- 不说“Godot 是 world model”，改说“Godot 是 world state 的沉浸式表达层”。
- 不说“AI 办公室会自动经营人生”，改说“AI 办公室让 agent 的判断、证据和反馈变得可读可控”。
- 不说“HTML 是未来办公室”，改说“HTML/React 是当前最适合构建人类可读工作台的实现媒介之一”。
- 不说“持续学习等于长期记忆”，改说“持续学习来自记忆写入、管理、读取、反馈和反思的治理闭环”。
- 不说“GUI 会被 CLI/API 取代”，改说“GUI 承载人类理解、验证和反馈，CLI/API 承载机器执行，二者服务于同一个 world model”。

## 9. 参考来源

- [World Models, Ha & Schmidhuber, 2018](https://arxiv.org/abs/1803.10122)
- [MuZero, Nature, 2020](https://www.nature.com/articles/s41586-020-03051-4)
- [DreamerV3, 2023](https://arxiv.org/abs/2301.04104)
- [The cognitive map in humans, Nature Neuroscience, 2017](https://www.nature.com/articles/nn.4656)
- [From cognitive maps to spatial schemas, Nature Reviews Neuroscience, 2023](https://www.nature.com/articles/s41583-022-00655-9)
- [Emergent World Representations / Othello-GPT, 2022](https://arxiv.org/abs/2210.13382)
- [Language Models Represent Space and Time, 2023](https://arxiv.org/abs/2310.02207)
- [Genie: Generative Interactive Environments, 2024](https://arxiv.org/abs/2402.15391)
- [Genie 2, Google DeepMind, 2024](https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/)
- [Video generation models as world simulators, OpenAI, 2024](https://openai.com/index/video-generation-models-as-world-simulators/)
- [V-JEPA 2, Meta, 2025](https://ai.meta.com/blog/v-jepa-2-world-model-benchmarks/)
- [Generative Agents, 2023](https://arxiv.org/abs/2304.03442)
- [Reflexion, 2023](https://arxiv.org/abs/2303.11366)
- [Voyager, 2023](https://arxiv.org/abs/2305.16291)
- [MemGPT, 2023](https://arxiv.org/abs/2310.08560)
- [A Survey on the Memory Mechanism of LLM-based Agents, 2024](https://arxiv.org/abs/2404.13501)
- [Memory for Autonomous LLM Agents, 2026](https://arxiv.org/abs/2603.07670)
- [Memex(RL), 2026](https://arxiv.org/abs/2603.04257)
- [OSWorld, 2024](https://arxiv.org/abs/2404.07972)
- [The Unreasonable Effectiveness of HTML examples](https://thariqs.github.io/html-effectiveness/)
- [Claude Artifacts documentation](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- [OpenAI Harness engineering](https://openai.com/index/harness-engineering/)
- Jeff Hawkins, *A Thousand Brains: A New Theory of Intelligence*, 2021.
- Terrence W. Deacon, *The Symbolic Species: The Co-evolution of Language and the Brain*, 1997.
- 苏煜访谈补充材料：Agent 技术史、Language Agent、micro-world specialization、continued learning 与 GUI/CLI 边界。
