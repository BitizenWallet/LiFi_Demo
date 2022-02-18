"use strict";

async function getWeb3() {
  return new Web3(provider);
}

function checkWalletConnect() {
  if (selectedAccount === undefined) {
    alert("Please connect to a wallet first");
    return true;
  }
}

async function advancedRoutes(arg) {
  if (checkWalletConnect()) {
    return;
  }

  document.getElementById("json-result").innerHTML = "loading...";
  document.getElementById("routeID").innerHTML = "loading...";

  var postData;

  if (arg == "1") {
    postData = {
      options: {
        integrator: "BitizenCrossSWAP",
        slippage: 0.03,
      },
      fromChainId: 137,
      fromAmount: "1110647",
      fromTokenAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
      toChainId: 137,
      toTokenAddress: "0x0000000000000000000000000000000000000000",
      fromAddress: selectedAccount,
      toAddress: selectedAccount,
    };
  } else {
    postData = {
      options: {
        integrator: "BitizenCrossSWAP",
        slippage: 0.03,
      },
      fromChainId: 137,
      fromAmount: "278749164698139740",
      fromTokenAddress: "0x0000000000000000000000000000000000000000",
      toChainId: 250,
      toTokenAddress: "0x0000000000000000000000000000000000000000",
      fromAddress: selectedAccount,
      toAddress: selectedAccount,
    };
  }

  updateCodePreview(postData);

  let apiRoute = await fetch("https://li.quest/v1/advanced/routes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(postData),
  });

  console.log(apiRoute);
  let routeData = await apiRoute.json();

  updateCodePreview(routeData);

  if (routeData.routes[0] === undefined) {
    document.getElementById("routeID").innerHTML = "No route found";
    alert("No route found");
    return;
  }

  appDataRouteNumber = 0;
  appDataAllRoutes = routeData.routes;

  setRoute();
}

async function nextRoute() {
  if (appDataAllRoutes[appDataRouteNumber + 1] == undefined) {
    document.getElementById("routeID").innerHTML = "no more route available";
    alert("no more route available");
    return;
  }

  appDataRouteNumber = appDataRouteNumber + 1;
  setRoute();
}

async function beforeRoute() {
  if (appDataAllRoutes[appDataRouteNumber - 1] == undefined) {
    document.getElementById("routeID").innerHTML = "no more route available";
    alert("no more route available");
    return;
  }

  appDataRouteNumber = appDataRouteNumber - 1;
  setRoute();
}

async function setRoute() {
  if (appDataAllRoutes[appDataRouteNumber] == undefined) {
    return;
  }

  updateText("routeNumber", appDataRouteNumber);

  appDataRoute = appDataAllRoutes[appDataRouteNumber];

  document.getElementById("fromTokenAddress").innerHTML =
    appDataRoute.fromToken.address;
  document.getElementById("toTokenAddress").innerHTML =
    appDataRoute.toToken.address;

  document.getElementById("routeID").innerHTML = appDataRoute.id;

  document.getElementById("fromToken").innerHTML =
    appDataRoute.fromToken.name + ", " + appDataRoute.fromToken.chainId;

  document.getElementById("toToken").innerHTML =
    appDataRoute.toToken.name + ", " + appDataRoute.toToken.chainId;

  document.getElementById("toAmount").innerHTML = appDataRoute.toAmount;

  let percentage =
    (appDataRoute.toAmountUSD / appDataRoute.fromAmountUSD) * 100;

  document.getElementById("fromAmount").innerHTML =
    appDataRoute.fromAmount + ", $" + appDataRoute.fromAmountUSD;

  document.getElementById("toAmount").innerHTML =
    appDataRoute.toAmount +
    ", $" +
    appDataRoute.toAmountUSD +
    " (" +
    Math.round(percentage) +
    "%)";

  document.getElementById("gasCostUSD").innerHTML = appDataRoute.gasCostUSD;

  updateCodePreview(appDataRoute);

  appDataSteps = [];
  updateStep("step1action", "-");
  updateStep("step2action", "-");
  updateStep("step3action", "-");
  appDataSteps = appDataRoute.steps;

  appDataSteps[0] = appDataRoute.steps[0];
  updateStep("step1action", appDataSteps[0]);
  if (appDataRoute.steps[1] != undefined) {
    appDataSteps[1] = appDataRoute.steps[1];
    updateStep("step2action", appDataSteps[1]);
  }

  // if (appDataRoute.steps[0].includedSteps != undefined) {
  //   let includedSteps = appDataRoute.steps[0].includedSteps;

  //   appDataSteps[0] = includedSteps[0];
  //   updateStep("step1action", appDataSteps[0]);

  //   if (includedSteps[1] != undefined) {
  //     appDataSteps[1] = includedSteps[1];
  //     updateStep("step2action", appDataSteps[1]);
  //   }

  //   appDataSteps[2] = appDataRoute.steps[1];
  //   updateStep("step3action", appDataSteps[2]);
  // } else {
  //   appDataSteps[0] = appDataRoute.steps[0];
  //   updateStep("step1action", appDataSteps[0]);
  //   if (appDataRoute.steps[1] != undefined) {
  //     appDataSteps[1] = appDataRoute.steps[1];
  //     updateStep("step2action", appDataSteps[1]);
  //   }
  // }
}

async function setApproved() {
  let web3 = await getWeb3();
  let myContract = await getContract();
  let toWei = web3.utils.toWei("10", "ether");

  if ((await getApproved()) == 0) {
    console.log("approve, 0");
    myContract.methods
      .approve(appDataApprovalAddress, toWei)
      .send({ from: selectedAccount });
  }
}

async function getContract() {
  let web3 = await getWeb3();

  let myContract = new web3.eth.Contract(
    human_standard_token_abi,
    appDataApprovalAddress,
    {
      from: selectedAccount,
    }
  );

  return myContract;
}

async function getApproved() {
  try {
    let myContract = await getContract();
    let o = await myContract.methods
      .allowance(selectedAccount, appDataApprovalAddress)
      .call();

    updateToolbarText("getApproved: " + o);

    return o;
  } catch (error) {
    console.log("no contract?");
    console.error(error);
    return -1;
  }
}

async function setRunStep(num) {
  if (appDataSteps[num] == undefined) {
    return;
  }

  let step = appDataSteps[num];
  appDataStep = step;

  appDataApprovalAddress = step.estimate.approvalAddress;
  updateText("approvalAddress", appDataApprovalAddress);

  updateText(
    "workingStepSymbol",
    step.action.fromToken.symbol + " -> " + step.action.toToken.symbol
  );

  updateText("workingStep", Number(num) + 1 + ", " + step.id);

  updateText("estimateFromAmount", appDataStep.estimate.fromAmount);
  updateText(
    "estimateToAmount",
    appDataStep.estimate.toAmount + " ~ " + appDataStep.estimate.toAmountMin
  );
  updateText(
    "estimateGasCostsAmount",
    appDataStep.estimate.gasCosts[0].amount +
      ", $" +
      appDataStep.estimate.gasCosts[0].amountUSD
  );

  updateCodePreview(appDataRoute.steps[num]);
}

async function runStep() {
  /// 1. check balance
  /// 2. execute step
  /// 3. sign transaction

  var tokenBalance;

  console.log("runStep", appDataStep);

  if (appDataStep.action.fromToken.address == AddressZero) {
    tokenBalance = await getBalance();
  } else {
    tokenBalance = await getBalance("erc20");
  }

  console.log("tokenBalance", tokenBalance, appDataStep.action.fromAmount);

  if (tokenBalance > appDataStep.action.fromAmount) {
    alert("Not enough tokens");
    return;
  }

  executeStep(appDataStep);
}

async function executeStep(step) {
  console.log("executeStep", step.type, "->");

  switch (step.type) {
    case "lifi":
    case "cross":
      await executeCross(step);
      break;
    case "swap":
      await executeSwap(step);
      break;
    default:
      console.log("unknown step type", stepType);
  }
}

async function executeCross(step) {
  console.log("executeCross", step.tool);

  switch (step.tool) {
    case "connext":
    case "nxtp": // keep for some time while user still may have unfinished routes locally
      // return await this.nxtpExecutionManager.execute(crossParams);
      break;
    case "hop":
      // return await this.hopExecutionManager.execute(crossParams);
      break;
    case "horizon":
      // return await this.horizonExecutionManager.execute(crossParams);
      break;
    case "cbridge":
      // return await this.cbridgeExecutionManager.execute(crossParams);
      break;
    case "multichain":
    case "anyswap": // keep for some time while user still may have unfinished routes locally
      //return await this.multichainExecutionManager.execute(crossParams);
      break;
    default:
      console.log("Should never reach here, bridge not defined");
  }
}

async function executeSwap(step) {
  console.log("executeSwap", step.tool);

  if (step.estimate.data == undefined) {
    alert("no estimate data");
    return;
  }

  switch (step.tool) {
    case "paraswap":
      paraswap(step.estimate.data);
      break;
    case "oneinch":
      //
      break;
    case "openocean":
      //
      break;
    case "zerox":
      break;
    case "dodo":
      break;
    default:
    //
  }
}

async function getBalance(isERC20) {
  let web3 = await getWeb3();

  if (isERC20 != "erc20") {
    let balance = await web3.eth.getBalance(selectedAccount);
    updateToolbarText("balance: " + balance);
    return balance;
  } else {
    try {
      let contract = await getContract();
      let erc20Balance = await contract.methods
        .balanceOf(selectedAccount)
        .call();
      updateToolbarText("erc20 balance: " + erc20Balance);
      return erc20Balance;
    } catch (error) {
      alert(error);
    }
  }
}

async function getSwapContract(swapContractAddress, chainId) {
  let abiURL =
    "https://api.polygonscan.com/api?module=contract&action=getabi&address=" +
    swapContractAddress +
    "&apikey=Y6K1PDKTXQYWGB3GDXSCXKGTEKT8JKMTST";

  let abi = await fetch(abiURL, {
    method: "GET",
  });

  let abiJSON = await abi.json();

  let abiObject = JSON.parse(abiJSON.result);

  let web3 = await getWeb3();

  let swapContract = new web3.eth.Contract(abiObject, swapContractAddress);

  console.log(swapContract);

  return swapContract;
}

async function paraswap(estimateData) {
  console.log("paraswap", estimateData);

  /// https://developers.paraswap.network/api/build-parameters-for-transaction
  /// partnerAddress, partnerFeeBps
  ///
  /// If provided it is used together with partnerAddress.
  /// Should be in basis points percentage.
  /// Look at slippage parameter description for understanding better. Eg: 200 (for 2% fee percent)

  // api.paraswap.io (POST https://api.paraswap.io/transactions/137/)

  let postData = {
    srcToken: estimateData.srcToken,
    destToken: estimateData.destToken,
    srcAmount: estimateData.srcAmount,
    destAmount: appDataStep.estimate.toAmountMin, //使用最小值更容易完成交易
    priceRoute: estimateData,
    userAddress: selectedAccount,
    partner: "paraswap.io",
    srcDecimals: 6,
    destDecimals: 18,
  };

  updateCodePreview(postData);

  var transactionsReceipt;

  try {
    let apiBuildData = await fetch(
      "https://api.paraswap.io/transactions/137/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(postData),
      }
    );

    console.log("Status: ", apiBuildData.status);
    console.log("StatusText: ", apiBuildData.statusText);

    if (apiBuildData.status == 200) {
      transactionsReceipt = await apiBuildData.json();

      let web3 = await getWeb3();
      let log = await web3.eth.sendTransaction(transactionsReceipt);

      console.log(log);
    } else {
      console.log(await apiBuildData.json());
    }
  } catch (error) {
    alert(error);
    return;
  }
}
