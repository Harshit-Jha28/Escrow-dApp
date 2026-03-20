#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, U256};

/// Escrow state machine
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    Pending,   // Awaiting mutual agreement
    Released,  // Funds released to seller (both agreed)
    Cancelled, // Funds refunded to buyer (both agreed)
    Expired,   // Timeout reached - refund to buyer
}

/// Escrow data stored per ID
#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub buyer: Address,
    pub seller: Address,
    pub amount: i128,
    pub created_at: u64,
    pub deadline: u64,
    pub buyer_released: bool,
    pub seller_released: bool,
    pub buyer_cancelled: bool,
    pub seller_cancelled: bool,
}

/// Storage keys
#[contracttype]
pub enum DataKey {
    EscrowCount,
    Escrow(U256),
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Create a new escrow - ANYONE can call this (permissionless creation)
    /// Buyer deposits funds via token transfer before calling this
    /// Args: seller address, deadline (unix timestamp)
    pub fn create(env: Env, buyer: Address, seller: Address, deadline: u64) -> U256 {
        let count_key = DataKey::EscrowCount;
        let escrow_id: U256 = env
            .storage()
            .instance()
            .get(&count_key)
            .unwrap_or(U256::from_u32(&env, 0));

        let next_id = U256::from_u32(&env, (escrow_id.to_u128().unwrap_or(0) + 1) as u32);
        env.storage().instance().set(&count_key, &next_id);

        let escrow = Escrow {
            buyer,
            seller,
            amount: 0i128,
            created_at: env.ledger().timestamp(),
            deadline,
            buyer_released: false,
            seller_released: false,
            buyer_cancelled: false,
            seller_cancelled: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id.clone()), &escrow);
        escrow_id
    }

    /// Set escrow amount (called after buyer transfers tokens)
    pub fn set_amount(env: Env, escrow_id: U256, amount: i128) {
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .expect("escrow not found");

        assert!(escrow.amount == 0, "amount already set");
        escrow.amount = amount;
        env.storage().persistent().set(&key, &escrow);
    }

    /// Get escrow details - ANYONE can read (permissionless reads)
    pub fn get_escrow(env: Env, escrow_id: U256) -> Escrow {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("escrow not found")
    }

    /// Get escrow state - ANYONE can read
    pub fn get_state(env: Env, escrow_id: U256) -> EscrowState {
        EscrowContract::get_escrow(env, escrow_id).into()
    }

    /// Release escrow - BOTH buyer and seller must call (mutual consent)
    /// Only buyer or seller of THIS escrow can call (not an admin)
    pub fn release(env: Env, escrow_id: U256, caller: Address) {
        caller.require_auth();
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .expect("escrow not found");

        assert!(
            caller == escrow.buyer || caller == escrow.seller,
            "not authorized"
        );
        assert!(
            escrow.deadline > env.ledger().timestamp()
                || escrow.buyer_released
                || escrow.seller_released,
            "deadline passed, use claim_timeout"
        );

        if caller == escrow.buyer {
            escrow.buyer_released = true;
        } else {
            escrow.seller_released = true;
        }

        env.storage().persistent().set(&key, &escrow);
    }

    /// Cancel escrow - BOTH buyer and seller must call (mutual consent)
    pub fn cancel(env: Env, escrow_id: U256, caller: Address) {
        caller.require_auth();
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .expect("escrow not found");

        assert!(
            caller == escrow.buyer || caller == escrow.seller,
            "not authorized"
        );

        if caller == escrow.buyer {
            escrow.buyer_cancelled = true;
        } else {
            escrow.seller_cancelled = true;
        }

        env.storage().persistent().set(&key, &escrow);
    }

    /// Claim timeout refund - only buyer can call after deadline
    pub fn claim_timeout(env: Env, escrow_id: U256, caller: Address) {
        caller.require_auth();
        let key = DataKey::Escrow(escrow_id);
        let escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .expect("escrow not found");

        assert!(caller == escrow.buyer, "only buyer can claim timeout");
        assert!(
            escrow.deadline <= env.ledger().timestamp(),
            "deadline not reached"
        );

        env.storage().persistent().set(&key, &escrow);
    }

    /// Check if escrow is resolved (either released, cancelled, or expired)
    pub fn is_resolved(env: Env, escrow_id: U256) -> bool {
        let escrow = EscrowContract::get_escrow(env.clone(), escrow_id);
        escrow.deadline <= env.ledger().timestamp()
            || (escrow.buyer_released && escrow.seller_released)
            || (escrow.buyer_cancelled && escrow.seller_cancelled)
    }

    /// Get total escrow count
    pub fn get_escrow_count(env: Env) -> U256 {
        env.storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(U256::from_u32(&env, 0))
    }
}

impl From<Escrow> for EscrowState {
    fn from(e: Escrow) -> Self {
        if e.buyer_released && e.seller_released {
            EscrowState::Released
        } else if e.buyer_cancelled && e.seller_cancelled {
            EscrowState::Cancelled
        } else if e.deadline <= 0 {
            EscrowState::Expired
        } else {
            EscrowState::Pending
        }
    }
}

mod test;
