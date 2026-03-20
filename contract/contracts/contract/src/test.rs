#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Env, U256};

#[test]
fn test_create_escrow() {
    let env = Env::default();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86400;

    let escrow_id = client.create(&buyer, &seller, &deadline);

    assert_eq!(escrow_id, U256::from_u32(&env, 0));
    assert_eq!(client.get_escrow_count(), U256::from_u32(&env, 1));

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.buyer, buyer);
    assert_eq!(escrow.seller, seller);
    assert_eq!(escrow.amount, 0);
    assert_eq!(escrow.deadline, deadline);
    assert!(!escrow.buyer_released);
    assert!(!escrow.seller_released);
    assert!(!escrow.buyer_cancelled);
    assert!(!escrow.seller_cancelled);
}

#[test]
fn test_set_amount() {
    let env = Env::default();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let escrow_id = client.create(&buyer, &seller, &(env.ledger().timestamp() + 86400));

    client.set_amount(&escrow_id, &1000i128);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.amount, 1000i128);
}

#[test]
fn test_release_flow_both_agree() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let escrow_id = client.create(&buyer, &seller, &(env.ledger().timestamp() + 86400));
    client.set_amount(&escrow_id, &5000i128);

    client.release(&escrow_id, &buyer);
    let escrow = client.get_escrow(&escrow_id);
    assert!(escrow.buyer_released);
    assert!(!escrow.seller_released);

    client.release(&escrow_id, &seller);
    let escrow = client.get_escrow(&escrow_id);
    assert!(escrow.buyer_released);
    assert!(escrow.seller_released);

    assert!(client.is_resolved(&escrow_id));
}

#[test]
fn test_cancel_flow_both_agree() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let escrow_id = client.create(&buyer, &seller, &(env.ledger().timestamp() + 86400));
    client.set_amount(&escrow_id, &3000i128);

    client.cancel(&escrow_id, &buyer);
    let escrow = client.get_escrow(&escrow_id);
    assert!(escrow.buyer_cancelled);
    assert!(!escrow.seller_cancelled);

    client.cancel(&escrow_id, &seller);
    let escrow = client.get_escrow(&escrow_id);
    assert!(escrow.buyer_cancelled);
    assert!(escrow.seller_cancelled);

    assert!(client.is_resolved(&escrow_id));
}

#[test]
fn test_claim_timeout() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;
    let escrow_id = client.create(&buyer, &seller, &deadline);
    client.set_amount(&escrow_id, &2000i128);

    env.ledger().set_timestamp(deadline + 1);

    client.claim_timeout(&escrow_id, &buyer);

    assert!(client.is_resolved(&escrow_id));
}

#[test]
#[should_panic(expected = "only buyer can claim timeout")]
fn test_only_buyer_can_claim_timeout() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;
    let escrow_id = client.create(&buyer, &seller, &deadline);
    client.set_amount(&escrow_id, &2000i128);

    env.ledger().set_timestamp(deadline + 1);

    client.claim_timeout(&escrow_id, &seller);
}

#[test]
#[should_panic(expected = "not authorized")]
fn test_only_parties_can_release() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let stranger = Address::generate(&env);
    let escrow_id = client.create(&buyer, &seller, &(env.ledger().timestamp() + 86400));
    client.set_amount(&escrow_id, &1000i128);

    client.release(&escrow_id, &stranger);
}

#[test]
fn test_multiple_escrows() {
    let env = Env::default();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer1 = Address::generate(&env);
    let seller1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);
    let seller2 = Address::generate(&env);

    let id1 = client.create(&buyer1, &seller1, &(env.ledger().timestamp() + 86400));
    let id2 = client.create(&buyer2, &seller2, &(env.ledger().timestamp() + 172800));

    assert_eq!(id1, U256::from_u32(&env, 0));
    assert_eq!(id2, U256::from_u32(&env, 1));
    assert_eq!(client.get_escrow_count(), U256::from_u32(&env, 2));

    let escrow1 = client.get_escrow(&id1);
    let escrow2 = client.get_escrow(&id2);
    assert_eq!(escrow1.buyer, buyer1);
    assert_eq!(escrow2.buyer, buyer2);
}

#[test]
fn test_get_state() {
    let env = Env::default();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let escrow_id = client.create(&buyer, &seller, &(env.ledger().timestamp() + 86400));

    assert_eq!(client.get_state(&escrow_id), EscrowState::Pending);
}

#[test]
#[should_panic(expected = "deadline not reached")]
fn test_deadline_not_reached_for_claim() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 10000;
    let escrow_id = client.create(&buyer, &seller, &deadline);
    client.set_amount(&escrow_id, &1000i128);

    client.claim_timeout(&escrow_id, &buyer);
}
