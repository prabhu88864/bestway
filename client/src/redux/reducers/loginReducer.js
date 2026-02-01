import * as types from "../actions/actionTypes";


const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

const initialState = {
  isLoggedIn: !!token,
  token: token || null,
  user: user || null,
  loading: false,
  error: null,
};

export default function loginReducer(state = initialState, action) {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        ...state,
        isLoggedIn: true,
        token: action.payload?.token,
        user: action.payload?.user,
        loading: false,
        error: null,
      };
    case "LOGOUT_USER":
      return { ...initialState, isLoggedIn: false, token: null, user: null };
    default:
      return state;
  }
}