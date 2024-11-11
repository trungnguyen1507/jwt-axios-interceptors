// Author: TrungQuanDev: https://youtube.com/@trungquandev
import axios from 'axios'
import { toast } from 'react-toastify'
import { handleLogoutAPI, refreshTokenAPI } from '~/apis'
import { history } from '~/helpers'

// Khởi tạo một đối tượng Axios (authorizedAxiosInstance) mục đích để custom và cấu hình chung cho dự án
let authorizedAxiosInstance = axios.create()

// Thời gian chờ tối đa của 1 request: để 10 phút
authorizedAxiosInstance.defaults.timeout = 1000 * 60 * 10

// withCredentials: sẽ cho phép axios tự động đính kèm và gửi cookie trong mỗi request lên BE (phục vụ trường hợp nếu chúng ta sử dụng JWT Tokens) theo cơ chế httpOnly Cookie
authorizedAxiosInstance.defaults.withCredentials = true

/**
 * Cấu hình Interceptors (Bộ đánh chặn vào giữa mọi Request & Response)
 */
// Add a request interceptor: Can thiệp vào giữa những cái request API
authorizedAxiosInstance.interceptors.request.use(
  (config) => {
    // Lấy accessToken từ LocalStorage và đính kèm vào header
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      // Cần thêm "Bearer" vì chúng ta cần tuân thủ theo tiêu chuẩn OAuth 2.0 trong việc xác định loại token đang sử dụng
      // Bearer là định nghĩa loại token dùng cho việc xác thực và uỷ quyền
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error)
  }
)

// Add a response interceptor: Can thiệp vào giữa những cái response nhận về từ API
authorizedAxiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error

    /* Khu vực xử lý RefreshToken tự động */
    // Nếu như nhận mã 401 từ BE, thì gọi api logout luôn
    if (error.response?.status === 401) {
      handleLogoutAPI().then(() => {
        // Trường hợp dùng cookie thì nhớ xoá userInfo trong Local Storage
        // localStorage.removeItem('userInfo')

        // Điều hướng tới trang Login
        history.navigate('/login')
      })
    }

    // Nếu như nhận mã 410 từ BE, thì sẽ gọi api refreshToken để làm mới lại accessToken
    // Đầu tiên lấy các request API đang bị lỗi từ error.config
    const originalRequest = error.config
    console.log('originalRequest: ', originalRequest)
    if (error.response?.status === 410 && !originalRequest._retry) {
      // Gán thêm giá tri _retry luôn = true trong thời gian chờ, để việc refreshToken chỉ luôn gọi 1 lần tại 1 thời điểm
      originalRequest._retry = true

      // Lấy refreshToken từ LocalStorage
      const refreshToken = localStorage.getItem('refreshToken')
      // Gọi api refreshToken
      return refreshTokenAPI(refreshToken)
        .then((res) => {
          // Lấy và gán lại accessToken vào LocalStorage
          const { accessToken } = res.data
          localStorage.setItem('accessToken', accessToken)
          authorizedAxiosInstance.defaults.headers.Authorization = `Bearer ${accessToken}`
          // Đồng thời accessToken đã được cập nhật lại ở Cookie

          // return lại authorizedAxiosInstance kết hợp với originalRequest để gọi lại những API ban đầu bị lỗi
          return authorizedAxiosInstance(originalRequest)
        })
        .catch((_error) => {
          // Nếu nhận bất kỳ lỗi nào từ API refreshToken thì logout luôn
          handleLogoutAPI().then(() => {
            // Trường hợp dùng cookie thì nhớ xoá userInfo trong Local Storage
            // localStorage.removeItem('userInfo')

            // Điều hướng tới trang Login
            history.navigate('/login')
          })

          return Promise.reject(_error)
        })
    }

    // Xử lý tập trung phần hiển thị thông báo lỗi trả về từ mọi API
    // Ngoại trừ mã 410 - GONE phục vụ việc tự động refresh lại token
    if (error.response?.status !== 410) {
      toast.error(error.response?.data?.message || error?.message)
    }
    return Promise.reject(error)
  }
)

export default authorizedAxiosInstance
