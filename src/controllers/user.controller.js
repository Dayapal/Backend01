
import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js";
import { User } from '../models/user.models.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body
    console.log('email', email)

    if (

        [fullName, email, username, password].some((field) => field.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are required")
    }

    const existedUser = User.findOne({
        $or: [{ username, email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exits")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const converImageLocalPath = req.files?.converImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    const converImage = await uploadCloudinary(converImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        converImage: converImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    })

    const createdUser = await User.findById(user._id).select(
        ("-password -refreshToken")
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while regitering the  user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created Successfully")
    )
})

export { registerUser }