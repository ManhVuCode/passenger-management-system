import { configureStore, type Middleware } from '@reduxjs/toolkit'
import { baseApi } from './baseApi'
import authReducer, { logout, setCredentials } from '../features/auth/authSlice'

// Xóa sạch cache RTK Query mỗi khi phiên đăng nhập thay đổi (đăng xuất / đăng nhập
// user khác) — nếu không, user mới sẽ nhìn thấy dữ liệu đã cache của user trước.
const resetApiOnAuthChange: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action)
  if (logout.match(action) || setCredentials.match(action)) {
    storeApi.dispatch(baseApi.util.resetApiState())
  }
  return result
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware, resetApiOnAuthChange),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
