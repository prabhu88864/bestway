import * as types from "./actionTypes";
import { loginApi } from "../../redux/apis/loginApi";

// Start Action
export const loginStart = () => ({
  type: types.LOGIN_START,
});

// Success Action
export const loginSuccess = (data) => ({
  type: types.LOGIN_SUCCESS,
  payload: data,
});

// Error Action
export const loginError = (error) => ({
  type: types.LOGIN_ERROR,
  payload: error,
});

// Logout Action
export const logoutUser = () => ({
  type: types.LOGOUT_USER,
});

// 🔥 MAIN LOGIN (ROLE BASED)
export const loginInitiate = (credentials, navigate) => {
  return function (dispatch) {
    dispatch(loginStart());

    loginApi(credentials)
      .then((res) => {
        const userData = res?.data;
        const token = userData?.token;
         const user = userData?.user;  
        const role = userData?.user?.role; // ✅ ROLE HERE
          console.log("role",role)
        // store token
        if (token) localStorage.setItem("token", token);
        if (user) localStorage.setItem("user", JSON.stringify(user));

        dispatch(loginSuccess(userData));

        // ✅ ROLE BASED NAVIGATION
        if (role === "ADMIN") {
          console.log("navigate type:", typeof navigate);

          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/dashboard");
        }
      })
      .catch((error) => {
        dispatch(loginError(error.message || "Login failed"));
      });
  };
};

export default {
  loginInitiate,
  logoutUser,
};
