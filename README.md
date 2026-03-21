# 🚀 Escrow Service (Soroban Smart Contract)

## 📌 Project Description
This project implements a basic Escrow Service using Soroban smart contracts on the Stellar blockchain. It enables secure transactions between a buyer and a seller without requiring trust between the parties.

Funds are held in escrow until predefined conditions are met, ensuring fairness and reducing risk in peer-to-peer transactions.

---

## ⚙️ What It Does

- Allows a buyer to lock funds into a smart contract
- Holds funds securely until release conditions are met
- Enables:
  - Buyer to release funds to seller
  - Seller to refund buyer if needed
- Prevents unauthorized access using cryptographic authentication

---

## ✨ Features

- 🔒 Secure escrow storage on-chain
- 👤 Buyer-controlled fund release
- 🔄 Seller-controlled refunds
- ⚡ Built on Soroban (fast & low-cost)
- 🧾 Transparent and verifiable transactions
- 🛡️ Prevents double spending / double release

---

## 🧱 Tech Stack

- **Blockchain:** Stellar
- **Smart Contracts:** Soroban
- **Language:** Rust
- **SDK:** soroban-sdk

---

## 🛠️ How It Works

1. **Create Escrow**
   - Buyer initializes escrow with:
     - Buyer address
     - Seller address
     - Amount

2. **Release Funds**
   - Buyer approves transaction
   - Funds are released to seller

3. **Refund**
   - Seller can cancel and refund buyer

---

## 📦 Contract Functions

| Function        | Description                     |
|----------------|--------------------------------|
| `create_escrow`| Initializes escrow             |
| `release`      | Releases funds to seller       |
| `refund`       | Refunds funds to buyer         |
| `get_escrow`   | Returns escrow details         |

---

## 🔗 Deployed Smart Contract Link

Escrow Service:  
contract address-CCA5QL6UBMEB7J4ISQ6XGOWKYWMCBMLG2E5LZQBAVZTMYVXQ7F6WPHSL
Link-https://stellar.expert/explorer/testnet/contract/CCA5QL6UBMEB7J4ISQ6XGOWKYWMCBMLG2E5LZQBAVZTMYVXQ7F6WPHSL


---

## 🚧 Future Improvements

- ⏳ Add time-based escrow expiry
- 🤝 Multi-signature approval (buyer + arbiter)
- ⚖️ Dispute resolution system
- 💰 Support for multiple token types
- 📱 Frontend dApp integration

---<img width="1920" height="1080" alt="Screenshot (90)" src="https://github.com/user-attachments/assets/3e29bc9c-fde1-40f1-b749-dd00c16a193a" />

<img width="1920" height="1080" alt="Screenshot (99)" src="https://github.com/user-attachments/assets/f02c088c-a89e-4521-b65a-36ca8a39a011" />

## 👨‍💻 Author
Harshit Jha

contact at-jhaharshit34@gmail.com

Built as a decentralized escrow solution using Stellar Soroban.
