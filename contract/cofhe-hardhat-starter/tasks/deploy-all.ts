import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-all', 'Deploy the full GhostGov system and wire all plugins')
  .addOptionalParam('quorum',   'Minimum votes for quorum (0 = disabled)', '0')
  .addOptionalParam('powercap', 'Max delegated power per delegate (0 = no cap)', '0')
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre

    console.log(`\n👻 Deploying GhostGov system to ${network.name}...`)
    const [deployer] = await ethers.getSigners()
    console.log(`   Deployer: ${deployer.address}`)
    console.log(`   Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`)

    //  1. GhostGov 
    console.log(`\n1/5  Deploying GhostGov...`)
    const GhostGov = await ethers.getContractFactory('GhostGov')
    const ghostgov = await GhostGov.deploy()
    await ghostgov.waitForDeployment()
    const govAddr = await ghostgov.getAddress()
    console.log(`     GhostGov:        ${govAddr}`)

    //  2. GhostTreasury ─
    console.log(`2/5  Deploying GhostTreasury...`)
    const GhostTreasury = await ethers.getContractFactory('GhostTreasury')
    const treasury = await GhostTreasury.deploy(govAddr)
    await treasury.waitForDeployment()
    const treasuryAddr = await treasury.getAddress()
    console.log(`     GhostTreasury:   ${treasuryAddr}`)

    //  3. GhostAnalytics 
    console.log(`3/5  Deploying GhostAnalytics...`)
    const quorum = parseInt(args.quorum)
    const GhostAnalytics = await ethers.getContractFactory('GhostAnalytics')
    const analytics = await GhostAnalytics.deploy(govAddr, quorum)
    await analytics.waitForDeployment()
    const analyticsAddr = await analytics.getAddress()
    console.log(`     GhostAnalytics:  ${analyticsAddr}`)

    //  4. GhostDelegation ─
    console.log(`4/5  Deploying GhostDelegation...`)
    const powerCap = parseInt(args.powercap)
    const GhostDelegation = await ethers.getContractFactory('GhostDelegation')
    const delegation = await GhostDelegation.deploy(govAddr, powerCap)
    await delegation.waitForDeployment()
    const delegationAddr = await delegation.getAddress()
    console.log(`     GhostDelegation: ${delegationAddr}`)

    //  5. GhostVoter 
    console.log(`5/5  Deploying GhostVoter...`)
    const GhostVoter = await ethers.getContractFactory('GhostVoter')
    const ghostVoter = await GhostVoter.deploy(govAddr)
    await ghostVoter.waitForDeployment()
    const ghostVoterAddr = await ghostVoter.getAddress()
    console.log(`     GhostVoter:      ${ghostVoterAddr}`)

    //  Wire up ─
    console.log(`\nWiring contracts...`)
    const gov = ghostgov as any
    await (await gov.setAnalyticsEngine(analyticsAddr)).wait()
    console.log(`     GhostGov.analyticsEngine = GhostAnalytics ✓`)
    await (await gov.setTreasury(treasuryAddr)).wait()
    console.log(`     GhostGov.treasury = GhostTreasury ✓`)
    await (await gov.setDelegation(delegationAddr)).wait()
    console.log(`     GhostGov.delegation = GhostDelegation ✓`)
    await (await gov.setGhostVoter(ghostVoterAddr)).wait()
    console.log(`     GhostGov.ghostVoter = GhostVoter ✓`)

    //  Save + print 
    saveDeployment(network.name, 'GhostGov',        govAddr)
    saveDeployment(network.name, 'GhostAnalytics',  analyticsAddr)
    saveDeployment(network.name, 'GhostTreasury',   treasuryAddr)
    saveDeployment(network.name, 'GhostDelegation', delegationAddr)
    saveDeployment(network.name, 'GhostVoter',      ghostVoterAddr)

    console.log(`\n✅ Deployment complete. Update frontend/lib/contracts.ts:`)
    console.log(`   CONTRACT_ADDRESSES[chainId]    = "${govAddr}"`)
    console.log(`   ANALYTICS_ADDRESSES[chainId]   = "${analyticsAddr}"`)
    console.log(`   TREASURY_ADDRESSES[chainId]    = "${treasuryAddr}"`)
    console.log(`   DELEGATION_ADDRESSES[chainId]  = "${delegationAddr}"`)
    console.log(`   GHOSTVOTER_ADDRESSES[chainId]  = "${ghostVoterAddr}"\n`)
  })
