// Author: TrungQuanDev: https://youtube.com/@trungquandev
import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'

// Middleware này đảm nhiệm việc: Lấy và xác thực accessToken nhận được từ FE có hợp lệ không
const isAuthorized = async (req, res, next) => {
  // Cách 1: Lấy accessToken từ trong cookies
  const accessTokenFromCookie = req.cookies?.accessToken
  if (!accessTokenFromCookie) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: 'Unauthorized! (Token not found)' })
    return
  }

  // Cách 2: Lấy accessToken trong headers nếu FE lưu token ở LocalStorage
  const accessTokenFromHeader = req.headers.authorization
  if (!accessTokenFromHeader) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: 'Unauthorized! (Token not found)' })
    return
  }

  try {
    // Bước 1: Giải mã token xem nó có hợp lệ không
    const accessTokenDecoded = await JwtProvider.verifyToken(
      // accessTokenFromCookie,
      accessTokenFromHeader.substring('Bearer '.length),
      process.env.ACCESS_TOKEN_SECRET_SIGNATURE
    )

    // Bước 2: Nếu token hợp lệ thì lưu thông tin vào req.jwtDecoded để sử dụng cho các tầng phía sau
    req.jwtDecoded = accessTokenDecoded

    // Bước 3: Cho phép request đi tiếp
    next()
  } catch (error) {
    // Trường hợp 1: Khi token bị lỗi hết hạn, thì sẽ trả về mã 410 - GONE để FE biết gọi API refresh
    if (error.message?.includes('jwt expired')) {
      res.status(StatusCodes.GONE).json({ message: 'Need to refresh token' })
      return
    }

    // Trường hợp 2: Các lỗi khác ngoài trường hợp hết hạn thì trả về lỗi 401 và FE Logout, đăng nhập lại
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: 'Unauthorized! Please login.' })
  }
}

export const authMiddleware = {
  isAuthorized
}
