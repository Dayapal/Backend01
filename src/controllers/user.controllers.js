
import asyncHandler from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js";
import { User } from '../models/user.models.js';
import { uploadCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose';

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")

    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body
    console.log('email', email)

    if (

        [fullName, email, username, password].some((field) => !field || field.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username, email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exits")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLocalPath)
    console.log("req.files:", req.files);


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password
    })

    const createdUser = await User.findById(user._id).select(
        ("-password -refreshToken")
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while regitering the  user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered  successfully")
    )
})


const loginUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body;
    console.log(email)
    if (!username && !email) {
        throw new ApiError(400, "email or username required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "User does not exist")

    }
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie('refreshToken', refreshToken, options)

        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },

                "User logged In successfully"
            )
        )
})



const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, { message: "User logged out successfully" })
        );

})


const requestAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request ")
    };

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh Token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, " refresh Token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true

        }
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user?._id)

        return res
            .status(200)
            .cookie("refreshToken", accessToken, options)
            .cookie("accessToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    'Access Token refreshed'
                )

            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Inalid refresh token")

    }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, } = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Password")
    }
    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            200,
            {},
            "Password changed Successfully"
        )

});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        }, { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account Details updated successfully"))
})



const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const avatarImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, avatarImage, "Avatar image updated success"))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const converImageLocalPath = req.file?.path

    if (!converImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const coverImage = await uploadCloudinary(converImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const userCoverImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, userCoverImage, "cover image updated successfully"))

})


const getUserProfileChannel = asyncHandler(async (req, res) => {

    const { username } = req.params;
    
    if (!username?.trim()) {
        throw new ApiError(400, "user name is missing ")
    }
    const channel = await User.aggregate([{
        $match: {
            username: username?.toLowerCase()
        }
    }, {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    }, {

        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount: {
                $size: "$subscribers"
            },
            channelSubscriberToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: {
                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                    then: true,
                    else: false
                }

            }
        }
    },
    {
        $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelSubscriberToCount: 1,
            coverImage: 1,
            isSubscribed: 1,
            avatar: 1,
            email: 1

        }
    }

    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exits")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(req.user._id)
            },
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }

        }
    ])

    return res
        .status(200)
        .json(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully!"
        )
})


export {

    registerUser, loginUser, logoutUser, requestAccessToken,
    changeCurrentPassword, getCurrentUser,
    updateAccountDetails, updateUserAvatar,
    updateUserCoverImage, getUserProfileChannel, getWatchHistory

}


