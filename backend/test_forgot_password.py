import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.user import User
from utils.auth import hash_password, verify_password, create_password_reset_token, verify_password_reset_token
from schemas.user import ForgotPasswordRequest, ResetPasswordRequest
from routes.auth import forgot_password, verify_reset_token, reset_password

def run_tests():
    print("==========================================")
    print("Running Forgot Password Backend Unit Tests")
    print("==========================================")

    db = SessionLocal()
    try:
        # Test 1: Check non-existent user
        non_existent_email = "notfound_user_2026_xyz@example.com"
        print(f"\n[Test 1] Testing forgot password with non-existent email: {non_existent_email}")
        req1 = ForgotPasswordRequest(email=non_existent_email)
        res1 = forgot_password(req1, db=db)
        print(f"  Response: success={res1.success}, is_registered={res1.is_registered}, message={res1.message}")
        assert res1.is_registered is False, "Expected is_registered to be False"
        print("  -> Passed: Correctly identified unregistered email and advised registration.")

        # Test 2: Create / ensure test user for testing reset
        test_email = "testreset@powersense.ai"
        user = db.query(User).filter(User.email == test_email).first()
        if not user:
            user = User(
                full_name="Test Reset User",
                email=test_email,
                phone="+91 98765 43210",
                password_hash=hash_password("oldPassword123"),
                role="user"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"\n[Setup] Created test user: {test_email}")

        # Test 3: Test forgot password for existing user
        print(f"\n[Test 2] Testing forgot password with registered email: {test_email}")
        req2 = ForgotPasswordRequest(email=test_email)
        res2 = forgot_password(req2, db=db)
        print(f"  Response: success={res2.success}, is_registered={res2.is_registered}, message={res2.message}")
        assert res2.is_registered is True, "Expected is_registered to be True"
        assert res2.success is True, "Expected success to be True"
        print("  -> Passed: Successfully processed registered user and sent reset email.")

        # Test 4: Verify Token
        print(f"\n[Test 3] Testing token generation and verification")
        token = create_password_reset_token(test_email)
        decoded = verify_password_reset_token(token)
        assert decoded is not None, "Token decoding failed"
        assert decoded.get("email") == test_email, "Email mismatch in token"
        print(f"  -> Passed: Token verified for email {decoded.get('email')}")

        # Test 5: Reset Password with token
        new_pwd = "newSecurePass2026!"
        print(f"\n[Test 4] Testing password reset with valid token")
        reset_req = ResetPasswordRequest(
            token=token,
            new_password=new_pwd,
            confirm_password=new_pwd,
            email=test_email
        )
        reset_res = reset_password(reset_req, db=db)
        print(f"  Response: success={reset_res.success}, message={reset_res.message}")
        assert reset_res.success is True, "Password reset failed"

        # Verify new password in DB
        db.refresh(user)
        is_verified = verify_password(new_pwd, str(user.password_hash))
        assert is_verified is True, "New password failed verification"
        print(f"  -> Passed: Database updated. User can successfully authenticate with new password!")

        print("\n==========================================")
        print("ALL TESTS PASSED SUCCESSFULLY (100%)")
        print("==========================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
