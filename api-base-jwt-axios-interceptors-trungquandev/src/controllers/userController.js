// Author: TrungQuanDev: https://youtube.com/@trungquandev
import { StatusCodes } from 'http-status-codes'
import ms from 'ms'
import { JwtProvider } from '~/providers/JwtProvider'

/**
 * Mock nhanh thông tin user thay vì phải tạo Database rồi query.
 * Nếu muốn học kỹ và chuẩn chỉnh đầy đủ hơn thì xem Playlist này nhé:
 * https://www.youtube.com/playlist?list=PLP6tw4Zpj-RIMgUPYxhLBVCpaBs94D73V
 */
const MOCK_DATABASE = {
  USER: {
    ID: 'trungquandev-sample-id-12345678',
    EMAIL: 'trungquandev.official@gmail.com',
    PASSWORD: 'trungquandev@123'
  }
}

const login = async (req, res) => {
  try {
    if (req.body.email !== MOCK_DATABASE.USER.EMAIL || req.body.password !== MOCK_DATABASE.USER.PASSWORD) {
      res.status(StatusCodes.FORBIDDEN).json({ message: 'Your email or password is incorrect!' })
      return
    }

    // Trường hợp nhập đúng thông tin tài khoản, tạo token và trả về cho phía Client
    // Tạo thông tin payload để đính kèm trong JWT Token: bao gồm id và email của user
    const userInfo = {
      id: MOCK_DATABASE.USER.ID,
      email: MOCK_DATABASE.USER.EMAIL
    }

    // Tạo ra 2 loại token: accessToken và refreshToken để trả về cho phía FE
    const accessToken = await JwtProvider.generateToken(userInfo, process.env.ACCESS_TOKEN_SECRET_SIGNATURE, '1h')

    const refreshToken = await JwtProvider.generateToken(
      userInfo,
      process.env.REFRESH_TOKEN_SECRET_SIGNATURE,
      '14 days'
    )

    /**
     * Xử lý trường hợp trả về http only cookie cho phía trình duyệt
     * maxAge - thời gian sống của Cookie
     */
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    // Trả về thông tin user và Tokens cho trường hợp FE lưu Tokens ở LocalStorage
    res.status(StatusCodes.OK).json({ ...userInfo, accessToken, refreshToken })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

const logout = async (req, res) => {
  try {
    // Xoá cookie
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.status(StatusCodes.OK).json({ message: 'Logout API success!' })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error)
  }
}

const refreshToken = async (req, res) => {
  try {
    // Cách 1: Lấy refreshToken luôn từ Cookie đã đính kèm vào request
    const refreshTokenFromCookie = req.cookies?.refreshToken
    // Cách 2: Lấy refreshToken từ Local Storage phía FE sẽ truyền vào body khi gọi API
    const refreshTokenFromBody = req.body?.refreshToken
    // Verify cái refreshToken xem có hợp lệ không
    const refreshTokenDecoded = await JwtProvider.verifyToken(
      // refreshTokenFromCookie,
      refreshTokenFromBody,
      process.env.REFRESH_TOKEN_SECRET_SIGNATURE
    )
    // Vì đã lưu thông tin user trong token, nên có thể lấy từ trong decoded ra, tiết kiệm query vào DB
    const userInfo = {
      id: refreshTokenDecoded.id,
      email: refreshTokenDecoded.email
    }
    // Tạo accessToken mới
    const accessToken = await JwtProvider.generateToken(userInfo, process.env.ACCESS_TOKEN_SECRET_SIGNATURE, '1h')
    // Res lại cookie accessToken mới cho trường hợp sử dụng Cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })
    // Trả về accessToken mới cho trường hợp FE lưu token ở Local Storage
    res.status(StatusCodes.OK).json({ accessToken })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Refresh Token API failed.' })
  }
}

export const userController = {
  login,
  logout,
  refreshToken
}
