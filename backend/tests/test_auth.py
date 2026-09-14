from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_password_hash_verification_accepts_original_password():
    hashed = hash_password("Admin1234!")

    assert hashed != "Admin1234!"
    assert verify_password("Admin1234!", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_access_token_preserves_subject_roles_and_type():
    token = create_access_token({"sub": "42", "roles": ["ADMIN", "CLIENT"]})

    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["roles"] == ["ADMIN", "CLIENT"]
    assert payload["type"] == "access"


def test_refresh_token_hash_is_stable_and_not_plaintext():
    token = create_refresh_token()

    first_hash = hash_token(token)
    second_hash = hash_token(token)

    assert len(token) == 128
    assert first_hash == second_hash
    assert first_hash != token
