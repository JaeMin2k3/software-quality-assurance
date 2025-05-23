const systemConfig = require("../../config/system");
const Account = require("../../model/accounts.model")
const md5 = require('md5')
// [GET] /admin/auth/login
module.exports.index = async (req,res)=>{
    if(req.cookies.token){
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`)
    }
    else{
        res.render("admin/page/auth/login.pug",{
            pageTitle: "Trang đăng nhập",
        });
    }
    
}
// [POST] /admin/auth/login
module.exports.indexPost = async (req,res)=>{
    const {email,password} = req.body
    
    const user = await Account.findOne({
        deleted: false,
        email: email,
    })

    if(!user){
        req.flash("error", "Email không tồn tại")
        res.redirect("back")
        return;
    }

    if(password!=user.password){
        req.flash("error", "Mật khẩu không đúng")
        res.redirect("back")
        return;
    }

    if(user.status=="inactive"){
        req.flash("error", "Tài khoản đã bị khóa")
        res.redirect("back")
        return;
    }
    res.cookie("token", user.token)
   res.redirect(`${systemConfig.prefixAdmin}/products`)
}
// [GET] /admin/auth/logout
module.exports.logout = async (req,res)=>{
    res.clearCookie("token")
    res.redirect(`${systemConfig.prefixAdmin}/auth/login`)
}