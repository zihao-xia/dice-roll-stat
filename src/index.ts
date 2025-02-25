interface RollResult {
  total: number;
  success: number;
  hardSuccess: number;
  extremeSuccess: number;
  criticalSuccess: number;
  failure: number;
  criticalFailure: number;
}

function main() {
  // 注册扩展
  let ext = seal.ext.find('dice-roll-stat');
  if (!ext) {
    ext = seal.ext.new('dice-roll-stat', 'Conatsu', '1.0.0');
    seal.ext.register(ext);
  }

  // ================= 统计指令 =================
  const cmdStat = seal.ext.newCmdItemInfo();
  cmdStat.name = '骰点统计';
  cmdStat.help = '统计历史骰点信息';

  cmdStat.solve = (ctx, msg) => {
    const { userId, nickname } = msg.sender;

    const storageKey = `rollStats_${userId}`;
    const storedData = ext.storageGet(storageKey);
    const data: RollResult = storedData
      ? JSON.parse(storedData)
      : {
          total: 0,
          success: 0,
          hardSuccess: 0,
          extremeSuccess: 0,
          criticalSuccess: 0,
          failure: 0,
          criticalFailure: 0,
        };

    const { total } = data;
    const successRate =
      total > 0
        ? (
            ((data.success +
              data.hardSuccess +
              data.extremeSuccess +
              data.criticalSuccess) /
              total) *
            100
          ).toFixed(1)
        : 0;

    const text = `${nickname} 的骰点统计为
      大成功: ${data.criticalSuccess}
      极难成功: ${data.extremeSuccess}
      困难成功: ${data.hardSuccess}
      成功: ${data.success}
      失败: ${data.failure}
      大失败: ${data.criticalFailure}
      成功率: ${successRate}%
      总次数: ${total}`;

    seal.replyToSender(ctx, msg, text);
    return seal.ext.newCmdExecuteResult(true);
  };

  // ================= 骰点指令 =================
  const cmdRoll = seal.ext.newCmdItemInfo();
  cmdRoll.name = 'st'; // 示例检定指令
  cmdRoll.help = '进行属性检定 格式：st 目标值';

  cmdRoll.solve = (ctx, msg, cmdArgs) => {
    const val = cmdArgs.getArgN(1);
    const target = parseInt(val);
    if (isNaN(target)) {
      seal.replyToSender(ctx, msg, '检定格式错误，示例：st 50');
      return seal.ext.newCmdExecuteResult(true);
    }

    const roll = Math.ceil(Math.random() * 100);
    const { userId } = msg.sender;

    // 记录检定结果
    const storageKey = `rollStats_${userId}`;
    const storedData = ext.storageGet(storageKey);
    const data: RollResult = storedData
      ? JSON.parse(storedData)
      : {
          total: 0,
          success: 0,
          hardSuccess: 0,
          extremeSuccess: 0,
          criticalSuccess: 0,
          failure: 0,
          criticalFailure: 0,
        };

    let resultText = '';
    if (roll <= Math.floor(target / 5)) {
      data.criticalSuccess++;
      resultText = `大成功！`;
    } else if (roll <= Math.floor(target / 2)) {
      data.extremeSuccess++;
      resultText = `极难成功！`;
    } else if (roll <= target) {
      data.hardSuccess++;
      resultText = `困难成功！`;
    } else if (roll < 100) {
      data.failure++;
      resultText = `失败！`;
    } else {
      data.criticalFailure++;
      resultText = `大失败！`;
    }

    data.total++;
    ext.storageSet(storageKey, JSON.stringify(data));

    seal.replyToSender(
      ctx,
      msg,
      `检定结果: D100=${roll}/${target} ${resultText}`
    );
    return seal.ext.newCmdExecuteResult(true);
  };

  // 注册命令
  ext.cmdMap['骰点统计'] = cmdStat;
}

main();
