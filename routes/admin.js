var db=require('../config/connection')
var express = require('express');
const productHeplers = require('../helpers/product-heplers');
var router = express.Router();
var productHelper=require('../helpers/product-heplers')
const { Db, LEGAL_TLS_SOCKET_OPTIONS, ObjectId } = require('mongodb');
const { response } = require('express');
var objectId=require('mongodb').ObjectId;
// const { ObjectId } = require('mongodb');
/* GET users listing. */
const verifyLoginadmin=(req,res,next)=>
{
  // console.log(req.session);
  if(req.session.adminLoggedIn)
    next()
  else
    res.redirect('/admin/ad-login')
}

router.get('/', function(req, res, next) {
  if(req.session.admin)
  {
  //   console.log("admin sussec");
    let adminlogin=req.session.admin
 productHelper.getAllProducts().then((products)=>
 {
  // console.log(products);
  res.render('admin/view-products', { products,admin:true,adminlogin});
 })

}
else
{
  res.redirect('/admin/ad-login')
//   console.log("admin fail",+login);
}
});
router.get('/ad-login',(req,res)=>
{
  if(req.session.admin)
  {
    console.log("redirected to /");
    res.redirect('/admin');
  }
  else
  {
    console.log("redirected to admin login");
    res.render('admin/admin-login',{loginErr:req.session.adminLoginErr,admin:true});
    req.session.adminLoginErr=false;
  }
});
router.post('/ad-login',(req,res)=>
{
  // console.log(req.bodyew);/
  productHeplers.doLogin(req.body).then((response)=>
  {
    if(response.status)
    {
      req.session.admin=response.admin;
      req.session.adminLoggedIn = true;
      console.log("excecuted response");
      res.redirect('/admin')
    }
    else
    {
      req.session.adminLoginErr="ivalid login credentials";
      res.redirect('/admin/ad-login')
    }
  })
});

router.get('/logout',(req,res)=>
{
  req.session.admin=null;
  req.session.adminLoggedIn=false
  res.redirect('/admin')
});

router.get('/add-product',function(req,res)
{
  res.render('admin/add-product',{admin:true})
})

router.post('/add-product',function(req,res)
{
  console.log(req.body);
  // console.log(req.files?.image);
  productHelper.addProduct(req.body,(insertedId)=>
  {
    let image=req.files.image
    // productHeplers.cropImage(image).then((err,done)=>
    image.mv(`./public/product-images/${insertedId}.jpg`,(err,done)=>
      {
        if(!err)
        res.render('admin/add-product',{admin:true})
        else
        console.log(err);
      })
   
  })
})
router.get('/delete-products/',(req,res)=>
{
  let proId=req.query.id;
  console.log(proId);
  productHeplers.deleteProduct(proId).then((response)=>
  {
    res.redirect('/admin/')
  })
})
router.get('/edit-products',async (req,res)=>
{
  let product=await productHeplers.getProductDetails(req.query.id)
  console.log(product)
  res.render('admin/edit-products',{product,admin:true})
})
router.post('/edit-products/:id',(req,res)=>
{
  // let qId=req.query.id;
  console.log(req.params.id);
  let id=req.params.id
  productHeplers.updateProduct(req.params.id,req.body).then(()=>
  {
    res.redirect('/admin')
    
    if(req.files.image)
    {
      let image=req.files.image;
      image.mv("./public/product-images/"+id+".jpg")
    }
  })
})

router.get('/orders',verifyLoginadmin,(req,res)=>
{
  productHeplers.getOrders().then((orders)=>
  {
    // console.log(orders);
    // for (let order of orders) {
    //   for (let product of order.products) {
    //     console.log(product);
        // Access the properties of the product object here
    //   }
    // }
    // console.log("this is customer"+orders.user);
      res.render('admin/all-orders',{orders,admin:true})

  })
})
// router.get('/orders/change-status',async(req,res)=>
// {
  
//   let id=req.query.id
//   // console.log("executing");
//   let orderProducts=await productHeplers.getOrderProductDetails(req.query.id)
//   // console.log(JSON.stringify(orderProducts)+" this is products");
//   // let product = await productHeplers.getProductDetails('63f4ef391a650af3d8d8f7d4');
//   // let products = [];
//   // let products = [];
//   console.log(orderProducts);
// // for (let i = 0; i < orderProducts.length; i++) {
// //   // console.log(`Iteration ${i}`);
// //   let product = await productHeplers.getProductDetails(orderProducts[i].item);
// //   // console.log(`Product ${i}: ${JSON.stringify(product)}`);
// //   product.quantity = orderProducts[i].quantity;
// //   products.push({
// //     product: product,
// //     orderProduct: orderProducts[i]
// //   });    

// // 
//   // }
  
//   // console.log(" these are the products"+products  );  
//   // let orderdetails= productHeplers.getOrderDetail(id)
//   // console.log("this is order detils"+JSON.stringify(response));
//   res.render('admin/change-status',{admin:true,orderProducts})
// })

router.get('/orders/change-status',async(req,res)=>
{
  // let orderProduct = req.session.order;
  let orderId = req.query.id;
  console.log("this is ordr id "+orderId);
  let orderDetails = await productHeplers.getOrderProductDetails(orderId);
  // console.log(orderDetails.product_);
  res.render('admin/change-status',{admin:true, orderDetails, orderId})
})
router.post('/orders/change-status',(req,res)=>
{
  let id=req.query.id
  console.log("this is id "+id);
  console.log(req.body);
  productHeplers.changePaymentStatus(req.body.id,req.body.status).then(()=>
    {
      console.log("payment successfull");
      res.json(response)
    })
  // res.render('admin/change-status',{admin:true,id})
  // console.log(req.body);
})
router.get('/users',verifyLoginadmin,(req,res)=>
{
  productHeplers.getUsers().then((response)=>
  {
    console.log(response);
    res.render('admin/users',{response,admin:true})
  })
 
})
router.get('/user/order',async(req,res)=>
{
  userId=req.query.id
  await productHeplers.getUserOrder(userId).then((orders)=>
  {
    
    // console.log(select+"this is select");
    
    res.render('admin/all-orders',{orders,admin:true,selected:true})

  })
  
})


module.exports = router;
