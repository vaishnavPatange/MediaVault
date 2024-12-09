import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { cloudinaryUpload } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccressAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // user.refreshToken = refreshToken;
        // await User.save({validateBeforeSave: false})
        await User.updateOne({_id: userId}, {refreshToken}, {runValidators: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiErrors(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    
    const {fullname, username, email, password} = req.body;
    
    if([fullname, username, email, password].some((field) => field?.trim() === "")){
        throw new ApiErrors(400, "All fields are required !!")
    }
    
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });
    if(existedUser) throw new ApiErrors(409, "User with email or username already exists");
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath) throw new ApiErrors(400, "Avatar file is required");

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)
        && req.files.coverImage.length > 0 ){
        
        coverImageLocalPath = req.files.coverImage[0].path;
    
    }


    
    const avatar = await cloudinaryUpload(avatarLocalPath);
    const coverImage = await cloudinaryUpload(coverImageLocalPath);
    if(!avatar) throw new ApiErrors(400, "Avatar file is required");
    
    const user = await User.create({
        username,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        fullname
    })
    
    
   const createdUser = await User.findById(user._id).select("-password -refreshToken");
   console.log(createdUser);
   if(!createdUser) throw new ApiErrors(500, "Something went wrong while registering the User");

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    );

});

const loginUser = asyncHandler(async(req, res) => {
    // get data - body
    // check if user exits (email, username)
    // check if password is correct
    // if user is authenticated the generate access and refresh tokens
    // send access and refresh token in form of cookies
    // send response with user obj except password and refresh token

    const {username, email, password} = req.body;

    if(!(username || email)) throw new ApiErrors(400, "Username or email is required");

    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!user) throw new ApiErrors(404, "User does not exists");

   const isUserAuthenticated = await user.isPasswordCorrect(password);

   if(!isUserAuthenticated) throw new ApiErrors(401, "Invalid Credentials");

   const {accessToken, refreshToken} = await generateAccressAndRefreshToken(user._id);

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const opt = {  // opt for cookies
        httpOnly: true,
        secure: true
   };

   return res
   .status(200)
   .cookie("accessToken", accessToken, opt)
   .cookie("refreshToken", refreshToken, opt)
   .json(
        new ApiResponse(
            200,
            {
                data: loggedInUser
            },
            "User Logged in Successfully"
        )
   );


});

const logoutUser = asyncHandler(async(req, res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    );

    const opt = {  // opt for cookies
        httpOnly: true,
        secure: true
   };

   return res
   .status(200)
   .clearCookie("refreshToken", opt)
   .clearCookie("accessToken", opt)
   .json(new ApiResponse(200, {}, "User logged out"))
})


export {
    registerUser,
    loginUser,
    logoutUser
};