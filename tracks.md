## 📊 **PostHog 完整上报内容总览表**

### 🔧 **自动捕获事件** (PostHog 内置)

| 事件名称 | 触发条件 | 关键字段 | 说明 |
|----------|----------|----------|------|
| `$pageview` | 页面加载 | `$current_url`, `$host`, `$pathname` | 自动页面浏览追踪 |
| `$pageleave` | 页面离开 | `$current_url`, `$duration` | 自动页面离开追踪 |
| `$autocapture` | 任何点击事件 | `$el_text`, `$el_tag`, `$el_attr_*` | 所有DOM元素点击 |
| `$performance` | 页面性能 | `$performance_*` | 页面加载性能指标 |
| `$exception` | JavaScript错误 | `$exception_message`, `$exception_stack` | 自动异常捕获 |

### 🎯 **增强追踪事件** (EnhancedPostHogTracker)

| 事件名称 | 触发条件 | 字段 | 数据类型 | 说明 |
|----------|----------|------|----------|------|
| **`$web_click_enhanced`** | 所有点击 | `tag_name` | string | 元素标签名 |
| | | `element_id` | string | 元素ID |
| | | `element_class` | string | 元素class |
| | | `element_text` | string | 元素文本(前100字符) |
| | | `element_href` | string | 链接地址 |
| | | `click_x`, `click_y` | number | 点击坐标 |
| | | `page_url` | string | 当前页面URL |
| **`$right_click`** | 右键点击 | `tag_name`, `element_text` | string | 右键点击的元素信息 |
| **`$key_press`** | 键盘按键 | `key`, `code` | string | 按键信息 |
| | | `alt_key`, `ctrl_key`, `shift_key` | boolean | 组合键状态 |
| **`$scroll`** | 滚动事件 | `scroll_x`, `scroll_y` | number | 滚动位置 |
| | | `scroll_percentage` | number | 页面滚动百分比 |
| **`$mouse_move`** | 鼠标移动 | `mouse_x`, `mouse_y` | number | 鼠标坐标 |
| **`$visibility_change`** | 页面可见性变化 | `hidden`, `visibility_state` | boolean/string | 页面隐藏状态 |
| **`$window_resize`** | 窗口大小变化 | `viewport_width`, `viewport_height` | number | 视口尺寸 |
| **`$page_loaded_enhanced`** | 页面加载完成 | `load_time`, `user_agent` | number/string | 增强的页面加载信息 |

### 🤖 **AI Overview 专项追踪**

| 事件名称 | 触发条件 | 字段 | 数据类型 | 说明 |
|----------|----------|------|----------|------|
| **`$ai_overview_reading`** | AI Overview可见性变化 | `visibility_percentage` | number | 当前可见百分比(0-100) |
| | | `max_reading_progress` | number | 最大阅读进度(不回退) |
| | | `time_on_element` | number | 在元素上的时间(毫秒) |
| | | `is_fully_visible` | boolean | 是否完全可见 |
| | | `page_url` | string | 当前页面URL |

### 📝 **业务逻辑追踪** (Analytics.ts)

| 事件类别 | 数据库表字段 | 触发条件 | 关键信息 |
|----------|-------------|----------|----------|
| **点击序列** | `click_sequence` | 点击任何链接 | 页面ID、停留时间、来源 |
| **内容展开** | `show_all_content_clicks` | 点击"显示更多"按钮 | 组件名称、点击时间 |
| **引用筛选** | `show_all_references_clicks` | 点击引用链接图标 | 引用索引、文本块信息 |

### 🔍 **PostHog 用户识别**

| 字段 | 来源 | 说明 |
|------|------|------|
| **用户ID** | URL参数 `RID` | 研究参与者标识符 |
| **会话隔离** | `sessionStorage` | 基于标签页的会话隔离 |

### ⚙️ **事件频率控制**

| 事件类型 | 节流策略 | 阈值 |
|----------|----------|------|
| 滚动事件 | 1秒节流 | - |
| 鼠标移动 | 5秒节流 | - |
| AI Overview阅读 | 10%变化阈值 | 可见性变化≥10% |
| 页面滚动 | 500ms节流 | - |
