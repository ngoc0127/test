import "./App.css";
import Nav from "./Nav/Nav";
import TokenPart from "./Token/Token";
import SenderTable from "./Table";
import Transfer from "./Transfer/Transfer";
import ConnectWallet from "./ConnectWallet";
import Fee from "./Fee";
import Airdrop from "./Airdrop";
import "bootstrap/dist/css/bootstrap.min.css";
import { Spinner } from "react-bootstrap";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TOKEN_ADDRESS } from "./config";

function App() {
  // State variables
  const [isConnected, setIsConnected] = useState(false); // Connection state
  const [tokenAddress, setTokenAddress] = useState(""); // ERC-20 token contract address
  const [wallets, setWallets] = useState([]); // List of recipient addresses
  const [quantity, setQuantity] = useState(0); // Tokens to send per wallet
  const [fee, setFee] = useState(0); // Gas fee per transaction (not actively used for Ethereum)
  const [loading, setLoading] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState(0); // Sender's token balance
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Fetch token balance of the sender's wallet
  useEffect(() => {
    if (tokenAddress && provider && account) {
      getTokenBalance();
    }
  }, [tokenAddress, provider, account]);

  const getTokenBalance = async () => {
    try {
      if (!provider || !account) return;
      
      const erc20ABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)",
      ];
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(account);
      setBalanceAmount(Number(ethers.formatUnits(balance, decimals)));
    } catch (error) {
      console.error("Error fetching token balance:", error);
      // alert("Failed to fetch token balance. Check the token address and try again.");
    }
  };

  async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request accounts access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await newProvider.getSigner();
        
        setProvider(newProvider);
        setSigner(newSigner);
        setTokenAddress(TOKEN_ADDRESS);
        console.log("accounts", accounts);
        setAccount(accounts[0]);
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
      }
    } else {
      console.error('MetaMask is not installed!');
      alert('Please install MetaMask!');
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts[0] !== account) {
        setIsConnected(false);
      }
      setAccount(accounts[0]);
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const handleConnect = async () => {
    if (!isConnected) {
      await connectMetaMask();
      setIsConnected(true);
    }
  };

  // Airdrop logic
  const handleAirdrop = async () => {
    if (!tokenAddress || wallets.length === 0 || quantity <= 0 || !signer) {
      alert("Please fill in all parameters and connect wallet!");
      return;
    }

    setLoading(true);
    try {
      const erc20ABI = [
        "function transfer(address to, uint256 value) public returns (bool)",
        "function decimals() view returns (uint8)",
      ];
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
      const decimals = await tokenContract.decimals();
      const amount = ethers.parseUnits(quantity.toString(), decimals);

      for (let i = 0; i < wallets.length; i++) {
        const recipient = wallets[i];
        console.log(`Transferring ${quantity} tokens to ${recipient}...`);

        // Estimate gas limit
        console.log("tokenContract", tokenContract);
        const gasLimit = await tokenContract.transfer.estimateGas(
          recipient,
          amount
        );
        const feeData = await provider.getFeeData();
        console.log("feeData", feeData);
        const gasPrice = feeData.gasPrice;

        let senderBalance = await provider.getBalance(account);
        if (senderBalance < gasLimit * gasPrice) {
          alert("Insufficient gas balance to perform airdrop!");
          throw new Error("Insufficient gas balance to perform airdrop!");
        }

        const tx = await tokenContract.transfer(recipient, amount);
        await tx.wait();
        console.log(`Successfully sent to ${recipient}`);
      }
      alert("Airdrop completed successfully!");
    } catch (error) {
      console.error("Airdrop failed:", error);
      // alert("Airdrop failed! Check the console for more details.");
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <Nav />
      {account && <h3>Current Account: {account}</h3>}
      <div style={{ opacity: loading ? 0.5 : 1 }}>
        {loading && (
          <div className="d-flex justify-content-center align-items-center custom-loading">
            <Spinner animation="border" variant="primary" role="status" />
          </div>
        )}
        <div className="connectWallet">
          {/* Future MetaMask Connection: Placeholder */}
          <div className="connectWallet">
          <ConnectWallet
            handleConnect={handleConnect}
            isConnected={isConnected}
          />
        </div>
          {/* <button className="btn btn-danger" disabled>
            <h3>MetaMask (Coming Soon)</h3>
          </button> */}
        </div>
        <div className="event">
          <SenderTable wallets={wallets} setWallets={setWallets} isConnected = {isConnected}/>
        </div>
        <div className="main">
          <TokenPart
            tokenaddress={tokenAddress}
            setTokenAddress={setTokenAddress}
            balanceAmount={balanceAmount}
          />
          <Transfer
            quantity={quantity}
            setQuantity={setQuantity}
            totalQuantity={wallets?.length ? wallets.length * quantity : 0}
            balanceAmount={balanceAmount}
          />
          {/* <Fee
            fee={fee}
            setFee={setFee}
            totalFee={wallets?.length ? wallets.length * fee : 0}
          /> */}
        </div>
        <div className="airdrop">
          <Airdrop
            isConnected={
              isConnected && wallets?.length
                ? wallets.length * quantity < balanceAmount
                : 0
            }
            handleAirdrop={handleAirdrop}
          />
          {/* <Airdrop handleAirdrop={handleAirdrop} isConnected={true} /> */}
        </div>
      </div>
    </div>
  );
}

export default App;