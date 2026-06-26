const hre = require("hardhat");

async function main() {
  const [deployer, producer, mill, transport, distributor] =
    await hre.ethers.getSigners();

  console.log("─────────────────────────────────────────");
  console.log("Déploiement OliChain");
  console.log("Réseau :", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("─────────────────────────────────────────");

  console.log("\n[1/5] Déploiement de OliveTrace…");
  const OliveTrace = await hre.ethers.getContractFactory("OliveTrace");
  const oliveTrace = await OliveTrace.deploy();
  await oliveTrace.waitForDeployment();
  const oliveTraceAddress = await oliveTrace.getAddress();
  console.log("       OliveTrace :", oliveTraceAddress);

  console.log("\n[2/5] Déploiement de OliPay…");
  const OliPay = await hre.ethers.getContractFactory("OliPay");
  const oliPay = await OliPay.deploy(oliveTraceAddress);
  await oliPay.waitForDeployment();
  const oliPayAddress = await oliPay.getAddress();
  console.log("       OliPay     :", oliPayAddress);

  console.log("\n[3/5] Liaison OliveTrace → OliPay…");
  const tx1 = await oliveTrace.setOliPayAddress(oliPayAddress);
  await tx1.wait();
  console.log("       OliPay autorisé à appeler markAsSold()");

  console.log("\n[4/5] Assignation des rôles…");
  const roles = [
    { address: producer.address, role: "producer", label: "Producteur" },
    { address: mill.address, role: "mill", label: "Moulin" },
    { address: transport.address, role: "transport", label: "Transporteur" },
    {
      address: distributor.address,
      role: "distributor",
      label: "Distributeur",
    },
  ];
  for (const { address, role, label } of roles) {
    const tx = await oliveTrace.assignRole(address, role);
    await tx.wait();
    console.log(`       ${label.padEnd(14)} ${address}`);
  }

  console.log("\n[5/5] Copier dans votre .env (frontend) :");
  console.log("─────────────────────────────────────────");
  console.log(`VITE_OLIVE_TRACE_ADDRESS=${oliveTraceAddress}`);
  console.log(`VITE_OLI_PAY_ADDRESS=${oliPayAddress}`);
  console.log(`VITE_CHAIN_ID=${hre.network.config.chainId}`);
  if (hre.network.name === "localhost") {
    console.log("VITE_EXPLORER_URL=http://localhost:8545");
  } else {
    console.log("VITE_EXPLORER_URL=https://amoy.polygonscan.com");
  }
  console.log("─────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
