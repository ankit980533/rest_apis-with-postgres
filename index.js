const express=require('express');
const app=express();
const bodyparser=require('body-parser');
const cookieParser=require('cookie-parser');
app.use(bodyparser.urlencoded({extended : false}));
app.use(bodyparser.json());
app.use(cookieParser());

const pool=require('./db');
const jwt=require('jsonwebtoken');
const secretKey="hello Mini";

const getPostById= async(id)=>{
    const{rows}=await pool.query('select * from posts where id=$1',[id]);
    console.log(rows[0]);
    return rows[0];
  }
  
const getUserIdFromToken = (token) => {
    // console.log("tsrt");

    try {
        const decoded = jwt.verify(token, secretKey);
        if (!decoded.id) {
           throw error('Invalid token');
        }
        return decoded.id;
    } catch (error) {
        return (error);
        
    }
};
app.post('/signup',async(req,res)=>{
    try {
        const {name,email ,password}=req.body;
        const result=await pool.query('Insert into users(name ,email ,password) values($1,$2,$3) returning *',[name,email,password]);
        const newUser=result.rows[0];
        //console.log(newUser);
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, secretKey);
        console.log(token);
       
        const response={
            statusCode:res.statusCode,
            userDetails:newUser,
            Token:token
        }
        //console.log(res.statusCode);
        //.toString()
        res.json(response);
        //res.send(newUser,token);
    } catch (error) {
        console.log(error);
        const response={
            statusCode:res.statusCode,
           error:error
        }
        res.json(response);
    }
})

app.post('/login',async(req,res)=>{
    try {
        const {email,password}=req.body;
        const result = await pool.query('select * from users where email=$1',[email]);
        const responseMsg={
            statusCode:res.statusCode,
            msg:"Invalid email"
        }
        if(result.rows.length===0){
            return res.json(responseMsg);
        }

        const user=result.rows[0];
        const responseMsg2={
            statusCode:res.statusCode,
            msg:"Invalid passWord"
        }
        if(user.password!=password){
            return res.json(responseMsg2);
        }
        const token = jwt.sign({ id: user.id, email: user.email }, secretKey);
        console.log(token);
        const response={
            statusCode:res.statusCode,
            userDetails: user,
            Token:token
        }
        //.toString()
        res.json(response);
    } catch (error) {
        const response={
            statusCode:res.statusCode,
           error:error
        }
        res.json(response);
    }
})                          

app.post('/posts',async(req,res)=>{
    try {
        const{title, content , token}=req.body;
        const userId=getUserIdFromToken(token);
        const result =await pool.query('Insert into posts (title ,content, user_id) values ($1,$2,$3) returning *',[title,content,userId]);
        const newPost=result.rows[0];
        const response={
            statusCode:res.statusCode,
            NewPost:newPost,
    
        }
        res.json(response);
    } catch (error) {
        const response={
            statusCode:res.statusCode,
           error:error
        }
        res.json(response);
    }
})

app.put('/posts/:postID',async(req,res)=>{
    try {
        const id=req.params.postID;
        console.log(id);
        const{title,content,token}=req.body;
        const userId=getUserIdFromToken(token);
        console.log(userId);
        const post = await getPostById(id);
            //console.log(post[0]);
            const response={
                statusCode:res.statusCode,
                msg:"you do not have permission to edit"
            }
        if (!post || post.user_id !== userId) {
            res.json(response);
        }
  else{
        const result= await pool.query('UPDATE posts SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING *',[title,content,id,userId]);
        if (result.rows.length === 0) {
                  return res.status(404).send('Post not found.');
                }
                const response={
                    statusCode:res.statusCode,
                    Post:result.rows[0],
            
                }
        res.json(response);
        }

    } catch (error) {
        const response={
            statusCode:res.statusCode,
           error:error
        }
        res.json(response);
    }
})

app.get('/allpost',async(req,res)=>{
    try {
        const result=await pool.query('select *from posts');
        const response={
            statusCode:res.statusCode,
            AllPost:result.rows

        }
res.json(response);
    } catch (error) {
        const response={
            statusCode:res.statusCode,
           error:error
        }
        res.json(response);
    }

})

app.get('/postByUser/:id',async(req,res)=>{
    const token=req.params.id;
    const userId=getUserIdFromToken(token);
    const result=await pool.query('select * from posts where user_id=$1',[userId]);

    const response={
        statusCode:res.statusCode,
        post:result.rows
    }
    res.json(response);
})

app.get('/postUserWise', async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT users.email, JSON_AGG(posts.*) AS user_posts
      FROM users
      LEFT JOIN posts ON users.id = posts.user_id
      GROUP BY users.id;
      `);
       
      const postsByUser = result.rows.map((user) => ({
        
        [user.email]: user.user_posts,
      }));
      console.log(result.rows);
      const response={
          statusCode:res.statusCode,
          post:postsByUser
      }
  
      res.json(response);
    } catch (error) {
      console.error(error);
      const response={
        statusCode:res.statusCode,
       error:error
    }
    res.json(response);
    }
  });



app.listen(3000,()=>
console.log("your app is running at port 3000"));