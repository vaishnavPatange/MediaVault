import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccressAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // user.refreshToken = refreshToken;
        // await User.save({validateBeforeSave: false})
        await User.updateOne(
            { _id: userId },
            { refreshToken },
            { runValidators: false }
        );

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiErrors(
            500,
            "Something went wrong while generating access and refresh token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullname, username, email, password } = req.body;

    if (
        [fullname, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiErrors(400, "All fields are required !!");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });
    if (existedUser)
        throw new ApiErrors(409, "User with email or username already exists");

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) throw new ApiErrors(400, "Avatar file is required");

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = await cloudinaryUpload(avatarLocalPath);
    const coverImage = await cloudinaryUpload(coverImageLocalPath);
    if (!avatar) throw new ApiErrors(400, "Avatar file is required");

    const user = await User.create({
        username,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        fullname,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    console.log(createdUser);
    if (!createdUser)
        throw new ApiErrors(
            500,
            "Something went wrong while registering the User"
        );

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User Registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // get data - body
    // check if user exits (email, username)
    // check if password is correct
    // if user is authenticated the generate access and refresh tokens
    // send access and refresh token in form of cookies
    // send response with user obj except password and refresh token

    const { username, email, password } = req.body;

    if (!(username || email))
        throw new ApiErrors(400, "Username or email is required");

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) throw new ApiErrors(404, "User does not exists");

    const isUserAuthenticated = await user.isPasswordCorrect(password);

    if (!isUserAuthenticated) throw new ApiErrors(401, "Invalid Credentials");

    const { accessToken, refreshToken } = await generateAccressAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const opt = {
        // opt for cookies
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, opt)
        .cookie("refreshToken", refreshToken, opt)
        .json(
            new ApiResponse(
                200,
                {
                    data: loggedInUser,
                },
                "User Logged in Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        {
            new: true,
        }
    );

    const opt = {
        // opt for cookies
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("refreshToken", opt)
        .clearCookie("accessToken", opt)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.accessToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiErrors(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) throw new ApiErrors(401, "Invalid refresh token");

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiErrors(401, "Refresh token is expired or used");
    }

    const { newRefreshToken, accessToken } = generateAccressAndRefreshToken(
        user._id
    );

    const opt = {
        // opt for cookies
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, opt)
        .cookie("refreshToken", newRefreshToken, opt)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Access token refreshed"
            )
        );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
        throw new ApiErrors(
            400,
            "Both old-password and new-password are required"
        );

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) throw new ApiErrors(401, "Invalid old-password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(201, {}, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully")
        );
});

const changeAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email)
        throw new ApiErrors(400, "fullname and email are required");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) throw new ApiErrors(400, "Avatar file is missing");

    const avatar = cloudinaryUpload(avatarLocalPath);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Image updated successfully"));
});
const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath)
        throw new ApiErrors(400, "CoverImage file is missing");

    const coverImage = cloudinaryUpload(coverImageLocalPath);

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "coverImage Image updated successfully")
        );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) throw new ApiErrors(400, "Username is missing");

    await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "Subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "SubscribedTo",
            },
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$Subscribers",
                },
                subscribedToCount: {
                    $size: "$SubscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$Subscribers.subscriber"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            },
        },
    ]);

    if (!channel?.length) throw new ApiErrors(404, "User not found");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
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
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return;
    res.status(200)
    .json(new ApiResponse(
      200,
      user[0].watchHistory,
      "WatchHistory fetched successfully"
    ));
});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    changeAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
