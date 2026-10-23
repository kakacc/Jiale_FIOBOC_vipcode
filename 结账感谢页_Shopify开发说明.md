# 结账感谢页：Shopify 开发落点

更新日期：2026-10-23。当前交付为可交互 HTML 原型及开发说明，尚未安装或部署 Shopify 应用。

## 原型预览入口

原型顶部「结账感谢页」Tab 始终可点击。未完成下单时展示标注为示例订单的页面，不创建订单或改变购物车、积分与净消费；完成模拟付款后展示最近一笔订单。该入口属于原型评审导航，不是正式商店新增的原生导航按钮。

## 开发范围

感谢页增加一个独立「本单会员回馈」应用区块。使用 `purchase.thank-you.block.render`，建议默认位置为 `ORDER_STATUS2`，位于买家详细信息之前；商家在结账与账户编辑器中配置最终位置。右侧原生商品与金额摘要不承担此次会员功能。该目标及位置来自 [Shopify Thank you Block 文档](https://shopify.dev/docs/api/checkout-ui-extensions/latest/targets/thank-you/block)。

主题代码不能直接实现这个会员区块。新版感谢页采用 Checkout UI Extensions；区块使用 Shopify 提供的组件并继承商家品牌样式，不能访问真实结账 DOM、注入任意 HTML 或覆盖组件 CSS。原型中的 HTML/CSS 仅表达内容、顺序与布局意图，正式开发映射至 Box、Stack、Heading、Text、Divider、Grid、Progress 等支持的组件。[组件限制](https://shopify.dev/docs/api/checkout-ui-extensions/latest/web-components)、[旧 checkout.liquid 迁移说明](https://shopify.dev/docs/apps/build/checkout)。

感谢页与订单状态页 UI 扩展适用于 Basic 及以上方案；信息、配送、付款步骤的 UI 扩展另有 Plus 限制。本次不要求修改付款步骤或原生金额。[套餐支持范围](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/checkout-apps/)。

## 展示内容与口径

| 内容 | 展示规则 | 数据要求 |
| --- | --- | --- |
| 本单预计可得积分 | 商品应付净额向下取整 × 消费时等级倍率；保留小数 | 会员服务返回本单预计积分，排除运费、税费、礼品卡金额；不使用总支付金额直接计分 |
| 可用日期 | 未发货显示「待发货后确定」「发货满 30 天后可用」；已发货显示实际可用日期；满 30 天后可显示已转为可用 | 使用会员服务返回的实际可用时间，不以支付时间加 30 天，也不以预计发货时间代替实际发货 |
| 当前等级 | 显示已生效的会员等级 | 未满足发货满 30 天条件的线上订单不能提前使当前等级升级 |
| 发货满 30 天后预计等级 | 根据届时近 12 个月合规净消费、已知成熟订单与本单净消费预估 | Member / VIP1 / VIP2 / VIP3 门槛为 $0 / $150 / $500 / $1,500；退款及历史消费到期后重算 |
| 等级进度 | 当前与预计等级并列；显示本单计入后预计合规净消费及距下一等级差额 | 预计保持原等级时也明确显示；VIP3 显示最高等级，不生成不存在的下一等级 |

线上消费的待生效期用于感谢页会员展示。原型用已生效历史消费和当前订单待入账时间计算此区块，未在本次重构其他页面的旧版等级演示逻辑；生产环境所有页面应统一读取会员服务的当前等级与预测结果。

## 首屏与后续访问

感谢页首次展示时 Shopify 订单可能尚未完成创建，但可取得订单 ID。应用应使用订单 ID 关联会员服务数据，并处理短暂同步中状态；缺少数据时不显示虚构的 0 积分或默认等级。感谢页不能直接修改订单。[生命周期与读取限制](https://shopify.dev/docs/apps/build/checkout/thank-you-order-status)。

后续从确认邮件或历史链接访问的是订单状态页。为让顾客查看发货后的准确可用日期，应在 `customer-account.order-status.block.render` 提供相同业务内容，并使用该页面的 Order API 和会员服务更新数据；不能仅安装感谢页目标。[订单状态页扩展](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/targets/order-status)。

## 后端接口约定

下列字段是本项目建议接口，不是 Shopify 自带字段。

| 字段 | 含义 |
| --- | --- |
| `orderId` | 当前订单的唯一标识 |
| `status` | `loading` / `ready` / `error` |
| `expectedPoints` / `earnRate` / `eligibleNet` | 本单预计积分、消费时倍率及合规商品净额 |
| `availableAt` | 实际可用时间，未发货时为 null；分批发货的归集结果由会员服务统一返回 |
| `pointsStatus` | 待发货、等待入账、已可用等真实状态 |
| `currentTier` / `projectedTier` | 当前已生效等级与本单满足等待期后的预计等级 |
| `projectedEligibleSpend` | 在相应滚动周期内，本单计入后的预计合规净消费 |
| `nextTier` / `remainingNet` | 下一等级及还差的消费额，最高等级时为空 |

应用服务使用订单与实际履约事件维护数据，按订单幂等处理积分与等级，不因刷新感谢页重复发积分或提前升级。前端查询经认证的应用接口；实际跨服务请求按扩展要求申请网络访问能力。首屏异步同步、接口异常均只影响会员区块，不影响原生订单确认。

## 验收

- 正常支付成功后展示感谢页；支付失败或取消确认时不产生成功页。
- 未发货时，即使支付已过 30 天，仍无具体可用日期且不提前升级。
- 已发货但未满 30 天显示准确日期；满 30 天后更新积分状态与已生效等级。
- 支持不升级、跨等级升级、最高等级、合规消费到期导致预计等级变化。
- 支持会员数据同步中和加载失败，不用默认数值伪装成功。
- 手机与桌面均以一个独立应用区块显示，不覆盖 Shopify 原生组件。

本地验证记录：`work/checkout-thank-you-validation.json` 与 `work/thank-you-loyalty-validation.json`。上线前还需在真实商店的结账与账户编辑器中验证区块位置、会员接口、履约事件和订单状态页两个目标。
