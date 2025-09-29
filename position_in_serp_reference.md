# Position in SERP 字段参考文档

## 字段格式

`position_in_serp` 格式：`{组件名称}_{索引}`

⚠️ **索引转换**：前端传入 0,1,2... → 记录为 1,2,3... (自动+1)

## 主要组合

### 搜索结果
- `SearchResults_2_1`, `SearchResults_3_2` - 第2页的第一个搜索结果、第3页的第二个搜索结果

### 引用
- `AiOverview-References_0` - AI Overview 回答侧边的引用，第一条
- `AIMode_1` - AI Mode 回答，侧边的引用，第二条（注意引用都是从0开始的，和filterIndex对照）


### 其他内容
- `Video_1` - 视频内容
- `DiscussionsAndForums_1` - 讨论论坛
- `PeopleAlsoSearch_1` - 人们也搜索
- `SearchTabs_1` - 搜索标签页（点击 “AI Mode”，“All”，“Image”等）
- `clickPagination_2` - 点击进入第二页的按钮
