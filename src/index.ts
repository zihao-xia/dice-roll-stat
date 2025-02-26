// 在 RollResult 接口前添加 COC 成功等级常量
const SUCCESS_RANK = {
  CRITICAL_FAILURE: -2,
  FAILURE: -1,
  SUCCESS: 1,
  HARD_SUCCESS: 2,
  EXTREME_SUCCESS: 3,
  CRITICAL_SUCCESS: 4,
} as const;

// 修改 RollResult 接口定义
interface RollResult {
  nickname: string;
  total: number;
  [SUCCESS_RANK.CRITICAL_SUCCESS]: number;
  [SUCCESS_RANK.EXTREME_SUCCESS]: number;
  [SUCCESS_RANK.HARD_SUCCESS]: number;
  [SUCCESS_RANK.SUCCESS]: number;
  [SUCCESS_RANK.FAILURE]: number;
  [SUCCESS_RANK.CRITICAL_FAILURE]: number;
}

function main() {
  // 注册扩展
  let ext = seal.ext.find('dice-roll-stat');
  if (!ext) {
    ext = seal.ext.new('dice-roll-stat', 'Conatsu', '1.0.0');
    seal.ext.register(ext);
  }

  // ================= 消息监听处理 =================
  ext.onMessageReceived = (ctx, msg) => {
    const text = msg.message.trim();
    const match = text.match(/D100=(\d+)\/(\d+)(\((.+)\))?/);

    if (match) {
      const d100 = parseInt(match[1]);
      const checkValue = parseInt(match[2]);
      const { userId, nickname } = msg.sender;

      // 使用当前COC规则进行检定
      const rule = seal.coc.newRule();
      const checkResult = rule.check(ctx, d100, checkValue);

      // 更新统计
      const storageKey = `rollStats_${userId}`;
      const storedData = ext.storageGet(storageKey);
      const data: RollResult = storedData
        ? JSON.parse(storedData)
        : {
            nickname,
            total: 0,
            [SUCCESS_RANK.CRITICAL_SUCCESS]: 0,
            [SUCCESS_RANK.EXTREME_SUCCESS]: 0,
            [SUCCESS_RANK.HARD_SUCCESS]: 0,
            [SUCCESS_RANK.SUCCESS]: 0,
            [SUCCESS_RANK.FAILURE]: 0,
            [SUCCESS_RANK.CRITICAL_FAILURE]: 0,
          };

      data.total++;
      switch (checkResult.successRank) {
        case SUCCESS_RANK.CRITICAL_SUCCESS:
          data[SUCCESS_RANK.CRITICAL_SUCCESS]++;
          break;
        case SUCCESS_RANK.EXTREME_SUCCESS:
          data[SUCCESS_RANK.EXTREME_SUCCESS]++;
          break;
        case SUCCESS_RANK.HARD_SUCCESS:
          data[SUCCESS_RANK.HARD_SUCCESS]++;
          break;
        case SUCCESS_RANK.SUCCESS:
          data[SUCCESS_RANK.SUCCESS]++;
          break;
        case SUCCESS_RANK.FAILURE:
          data[SUCCESS_RANK.FAILURE]++;
          break;
        case SUCCESS_RANK.CRITICAL_FAILURE:
          data[SUCCESS_RANK.CRITICAL_FAILURE]++;
          break;
      }

      data.nickname = nickname;

      ext.storageSet(storageKey, JSON.stringify(data));
    }
  };

  // ================= 完善统计指令 =================
  const cmdStat = seal.ext.newCmdItemInfo();
  cmdStat.name = '骰点统计';
  cmdStat.help = `统计历史骰点信息
用法：.骰点统计 [用户ID]（仅管理员可用）`;

  cmdStat.solve = (ctx, msg, cmdArgs) => {
    const targetUserId = cmdArgs.getArgN(1) || msg.sender.userId;
    const isAdmin = ctx.privilegeLevel >= 50;

    // 权限检查
    if (targetUserId !== msg.sender.userId && !isAdmin) {
      seal.replyToSender(ctx, msg, '你没有权限查看他人的骰点统计');
      return seal.ext.newCmdExecuteResult(true);
    }

    const storageKey = `rollStats_${targetUserId}`;
    const storedData = ext.storageGet(storageKey);

    if (!storedData) {
      seal.replyToSender(ctx, msg, '暂无骰点统计数据');
      return seal.ext.newCmdExecuteResult(true);
    }

    const data: RollResult = JSON.parse(storedData);
    const total = data.total || 0;

    const successCount =
      data[SUCCESS_RANK.SUCCESS] +
      data[SUCCESS_RANK.HARD_SUCCESS] +
      data[SUCCESS_RANK.EXTREME_SUCCESS] +
      data[SUCCESS_RANK.CRITICAL_SUCCESS];

    const successRate =
      total > 0 ? ((successCount / total) * 100).toFixed(1) : '0.0';

    const text = `骰点统计${
      targetUserId !== msg.sender.userId ? `（用户 ${data.nickname}）` : ''
    }
${data.nickname} 的骰点统计：
大成功: ${data[SUCCESS_RANK.CRITICAL_SUCCESS]}
极难成功: ${data[SUCCESS_RANK.EXTREME_SUCCESS]}
困难成功: ${data[SUCCESS_RANK.HARD_SUCCESS]}
成功: ${data[SUCCESS_RANK.SUCCESS]}
失败: ${data[SUCCESS_RANK.FAILURE]}
大失败: ${data[SUCCESS_RANK.CRITICAL_FAILURE]}
成功率: ${successRate}%
总次数: ${total}`;

    seal.replyToSender(ctx, msg, text);
    return seal.ext.newCmdExecuteResult(true);
  };

  // 注册命令
  ext.cmdMap['骰点统计'] = cmdStat;
}

main();
