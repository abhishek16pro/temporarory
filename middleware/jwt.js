import jwt from "jsonwebtoken";

const jwtToken = async (req, res, next)=>{
    try {
        let token = req.header("Authorization");
        // const token = req.cookies.jwt;
        if(!token){
            return res.status(403).json({"stat":"Ok","error":"No token","Verified":"false","Message":"Access Denied, token not found, Login again"});
        }
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            // req._id = verified.id;
            next(); 
        } catch (error) {
            return res.status(403).json({"stat":"Ok","error":"JWT token expire","Verified":"false","Message":"Login again"});
        }
        
    } catch (error) {
        console.log(error.Message)
        return res.status(500).json({"stat":"Ok","error":"","Verified":"false","Message":"Internal Server Problem"});
    }
}

export default jwtToken;
