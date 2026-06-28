# 使用 intangible_heritage_data.json 替换现有数据支撑的实现计划

## 一、数据结构对比分析

### 现有数据结构（拆分模式）
1. **骨架文件** (`heritage_skeleton_{lang}.json`):
   - 包含根节点 `name` 和一级分类 `children`
   - 每个分类包含: `name`, `slug`, `totalItems`

2. **分类详情文件** (`{lang}_{slug}.json`):
   - 包含 `category`, `items[]`
   - 每个 item 包含: `name`, `records[]`
   - records 字段: `publishTime`, `applyRegion`, `protectUnit`

### 新数据结构（完整模式）
`intangible_heritage_data.json`:
- 完整三级结构：根 → 一级分类 → 具体项目
- 每个分类包含: `name`, `children[]`
- 每个项目包含: `name`, `records[]`
- records 字段（中文）: `公布时间`, `申报地区或单位`, `保护单位`, `申报地区或单位_en`, `保护单位_en`

## 二、关键差异

| 差异点 | 现有代码期望 | 新数据文件 |
|--------|-------------|-----------|
| 加载方式 | 骨架+按需加载详情 | 一次性完整加载 |
| 分类字段 | `slug`, `totalItems` | 无 |
| 项目数组名 | `items` | `children` |
| records字段名 | 英文 (`publishTime`) | 中文 (`公布时间`) |
| 是否分语言 | 是 (`zh_`, `en_`) | 否（中英混在同一条记录） |

## 三、修改方案

### 3.1 修改文件
**文件**: `knowledge-graph.html`

### 3.2 修改内容

1. **数据加载路径修改**（约第285行）:
   - 将 `DATA_BASE_PATH` 改为指向 `intangible_heritage_data.json`
   - 移除拆分文件的加载逻辑

2. **buildGraphFromSkeleton 函数修改**（约第437行）:
   - 直接从完整数据构建图谱
   - 计算 `totalItems` 为 `children.length`
   - 生成 `slug` 用于唯一标识

3. **addCategoryItems 函数修改**（约第484行）:
   - 直接从完整数据中提取子项目
   - 映射中文字段名为英文字段名

4. **loadSkeleton 函数修改**（约第989行）:
   - 直接加载 `intangible_heritage_data.json`
   - 移除语言相关的文件名逻辑

5. **国际化处理**:
   - records 中的中文/英文字段需要根据当前语言切换显示

## 四、潜在风险与处理

1. **数据量过大**: 新文件是完整数据，可能较大，需要测试加载性能
   - 处理: 保持按需展开逻辑，只在用户双击时渲染子节点

2. **语言切换**: 新数据文件没有单独的英文版本
   - 处理: 使用 records 中的 `_en` 后缀字段实现语言切换

3. **字段映射错误**: 中文字段名需要正确映射
   - 处理: 建立字段映射表，确保兼容性

## 五、步骤清单

1. 修改 `DATA_BASE_PATH` 常量
2. 修改 `loadSkeleton` 函数，直接加载完整数据文件
3. 修改 `buildGraphFromSkeleton` 函数，计算分类信息
4. 修改 `addCategoryItems` 函数，映射字段名
5. 修改 `showTooltip` 函数，支持中英文字段切换
6. 测试验证

## 六、预期效果

- 知识图谱数据来源切换为 `intangible_heritage_data.json`
- 保留原有交互功能（双击展开、语言切换、视角适配）
- 数据更完整，包含所有批次的非遗项目