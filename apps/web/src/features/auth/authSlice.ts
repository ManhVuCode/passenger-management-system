import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  accessToken: string | null
  userId: string | null
  tenantId: string | null
  role: string | null
  name: string | null
}

const initialState: AuthState = {
  accessToken: localStorage.getItem('accessToken'),
  userId: localStorage.getItem('userId'),
  tenantId: localStorage.getItem('tenantId'),
  role: localStorage.getItem('role'),
  name: localStorage.getItem('name'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthState>) {
      Object.assign(state, action.payload)
      localStorage.setItem('accessToken', action.payload.accessToken ?? '')
      localStorage.setItem('userId', action.payload.userId ?? '')
      localStorage.setItem('tenantId', action.payload.tenantId ?? '')
      localStorage.setItem('role', action.payload.role ?? '')
      localStorage.setItem('name', action.payload.name ?? '')
    },
    logout(state) {
      Object.assign(state, { accessToken: null, userId: null, tenantId: null, role: null, name: null })
      localStorage.clear()
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
