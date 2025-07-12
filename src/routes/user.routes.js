import { Router } from "express";
import { registerUser  , loginUser, logoutUser, requestAccessToken, changeCurrentPassword, updateUserAvatar, getCurrentUser, updateAccountDetails, updateUserCoverImage, getUserProfileChannel, getWatchHistory} from "../controllers/user.controllers.js";
import  {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/register").post(
    
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);


router.route("/login").post(loginUser)

// secured routes 
router.route('/logoutUser').post( verifyJWT,logoutUser)
router.route('/refreshAccessToken').post(requestAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/update-account-details").post(verifyJWT, updateAccountDetails)
router.route("/history").post(verifyJWT, getWatchHistory)

router.route("/update-cover-image").patch(verifyJWT,upload.single("coverImage"), updateUserCoverImage)
router.route("/get-user").get(verifyJWT, getCurrentUser)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/c/:username").get(verifyJWT, getUserProfileChannel)

export default router;








