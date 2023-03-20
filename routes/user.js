const { response } = require('express');
var express = require('express');
const session = require('express-session');
const { ObjectId } = require('mongodb');
const { resolve } = require('promise');
var router = express.Router();
var productHelper=require('../helpers/product-heplers');
var userHelpers = require('../helpers/user-helpers');
const verifyLogin=(req,res,next)=>
{
  // console.log(req.session);
  if(req.session.userLoggedIn)
    next()
  else
    res.redirect('/login')
}
/* GET home page. */

router.get('/',async function(req, res, next) {

  let cartCount=null
  if(req.session.user)
  {
    cartCount=await userHelpers.getCartCount(req.session.user._id)
  }
  let user=req.session.user;
  // console.log(user);
  productHelper.getAllProducts().then((products)=>
  {
  //  console.log(products);  
   res.render('user/view-products', { products,admin:false,user,cartCount});
  })

  // res.render('index', { products,admin:false});
});
router.get('/login',(req,res)=>
{
  if(req.session.user)
  {
    res.redirect('/');
    
  }
  else
  {
    console.log("logging");

    res.render('user/user-login',{loginErr:req.session.userLoginErr});
    // console.log("err");
    req.session.userLoginErr=false;


  }
});
router.get('/signup',(req,res)=>
{
  console.log(req.body);
  res.render('user/user-signup')
})
router.post('/signup',(req,res)=>
{
  // userHelpers.doSignup(req.body).then((response)=>
  // {
  //   console.log(response)
   
  //   res.redirect('/')
  // })
  console.log(req.body);
  userHelpers.doSignup(req.body).then((response) => {
    console.log(JSON.stringify(response) +" this is also response");
    if (response) {
      req.session.user = response;
      req.session.userLoggedIn = true;
      // console.log(response+" this is response");
      res.redirect('/');
    } else {
      res.redirect('/signup');
    }
  })
});
  router.post('/login',(req,res)=>
  {
    userHelpers.doLogin(req.body).then((response)=>
    {
      if(response.status)
      {
        req.session.user=response.user;
        req.session.userLoggedIn = true;

        res.redirect('/')
      }
      else
      {
        req.session.userLoginErr="ivalid login credentials";
        res.redirect('/login')
      }
    })
  });
router.get('/logout',(req,res)=>
{
  req.session.user=null;
  req.session.userLoggedIn=false
  res.redirect('/')
});
router.get('/cart',verifyLogin,async(req,res)=>
{
  let products=await userHelpers.getCartProducts(req.session.user._id);
  let totalValue=await userHelpers.getTotalAmount(req.session.user._id)
  let user=req.session.user._id
  console.log(totalValue);
  res.render('user/cart',{products,user,totalValue})
});
router.get('/add-to-cart/:id',verifyLogin,(req,res)=>
{
  console.log('api call');
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>
  {
    res.json({status:true})
    
  })
});

router.post('/change-product-quantity',(req,res,next)=>
{
  // console.log(req.body);
  userHelpers.changeProductQuantity(req.body) .then(async(response) => {
    response.total=await userHelpers.getTotalAmount(req.body.user)
    // console.log("this is user  "+response.total);
    res.json(response)
  })
});
router.post('/delete-product',(req,res,next)=>
{
 
  userHelpers.delProduct(req.body).then((response)=>
  {
    res.send(response)
  })
});
router.get('/place-order',verifyLogin,async(req,res)=>
{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  // console.log(total+'  this is rout');
  console.log(req.session.user._id+"  this is chkout id");
  let user=req.session.user
    res.render('user/checkout',{total,user})
})
router.post('/place-order',async (req,res)=>
{
  let products=await userHelpers.getCartProductList(req.body.user)
  let totalamnt=await userHelpers.getTotalAmount(req.body.user)
  // let userId = req.body.user;
  // console.log("this is user products"+JSON.stringify(products)+"total"+totalamnt);
  // console.log(userId+"  this is user chkt id");
  userHelpers.placeOrder(req.body,products,totalamnt).then(async (orderId)=>
  {
    if(req.body['paymentMethod']=='cod')
    {
      res.json({codStatus:true})
    }
    else
    {
       userHelpers.generateRazorpay(orderId,totalamnt).then((response)=>
      {
        res.json(response)
      })
    }
  })
  // console.log(req.body);
  // console.log("Received request to place order");
})
router.get('/order-succes',(req,res)=>
{
  res.render('user/order-succes',{user:req.session.user})
})
router.get('/order',verifyLogin,async (req,res)=>
{
  let orders=await userHelpers.getUserOrders(req.session.user._id)
  // console.log(orders);
  res.render('user/orders',{user:req.session.user,orders})
})
router.get('/view-order-products/:id',async (req,res)=>
{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})
router.post('/verify-payment',(req,res)=>
{
  console.log(req.body);
  // res.sendStatus(200);
  userHelpers.verifyPayment(req.body).then((response)=>
  {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>
    {
      console.log("payment successfull");
      res.json({status:true})
    })
  }).catch((err)=>
  {
    console.log("payment feiled");
    res.json({status:false,errmsg:''})
  })
})

module.exports = router;
