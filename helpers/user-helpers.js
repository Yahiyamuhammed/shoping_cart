var db=require('../config/connection')
var collection=require('../config/collection')
var bcrypt=require('bcrypt');
const { Db, LEGAL_TLS_SOCKET_OPTIONS, ObjectId } = require('mongodb');
const { reject, resolve } = require('promise');
var objectId=require('mongodb').ObjectId;
var crypto = require('crypto');
const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');

const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
    // This is the SMTP mail server to use for notifications.
    // GCDS uses this mail server as a relay host.
    host: "smtp.gmail.com",
    // SMTP is unlike most network protocols, which only have a single port number.
    // Instead, there are several different ports that can be used for different purposes.
    port: 465,
    secure: true,
    auth: {
        user: "y29186135@gmail.com",
        pass: "tumrbdaejvgktyuv"
    }
});


var instance = new Razorpay({
  key_id: 'rzp_test_yu7Vb5aVrryDu9',
  key_secret: 'b67TY1nAk93eWHE8cpoluM14',
});

module.exports=
{
    doSignup:(userData)=>
    {
        return new Promise(async(resolve,reject)=>
        {
            console.log("this is user data email "+userData.email);
            if(await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email}))
            {
                console.log("email exists");
                resolve()
            }
            else{

                console.log("creating account");
                    userData.password=await bcrypt.hash(userData.password,10)
                    db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>
                    {
                        // data.status=true
                        userData._id = data.insertedId;
                        resolve(userData);
                        // console.log(data.insertedId);
                    })
                }
        });
       
    },
    doLogin:(userData)=>
    {
        return new Promise(async(resolve,reject)=>
        {
            let loginstatus=false;
            let response={};
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email});
            console.log(user);
            if(user)
            {
                bcrypt.compare(userData.password,user.password).then((status)=>
                {
                    if(status)
                    {
                        console.log("login success");
                        response.user=user;
                        response.status=status;
                        resolve(response);
                    }
                    else
                    {
                        console.log("login failed");
                        resolve(status=false)
                    }
                })
            }
            else
            {
                console.log("login failed-email");
                resolve(status=false)
            }
        })
    },
    addToCart:(proId,userId)=>
    {
        let proObj=
        {
            item:new objectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>
        {
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)});
            if(userCart)
            {
                let proExist=userCart.products.findIndex(product=>product.item==proId)
                console.log(proExist);
                if(proExist!=-1)
                {
                    console.log('pro exist');
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:new objectId(userId),"products.item":new objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }).then(()=>
                    {
                        resolve()
                    })
                }
                else
                {
                  db.get().collection(collection.CART_COLLECTION).updateOne({user:new objectId(userId)},
                    {
                      $push:
                        {
                            products: proObj
                        }
                    }).then((responce)=>
                    {
                        resolve();
                    })
                }
            }
            else
           {
                let cartObj=
                {
                    user:new objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((respsonse)=>
                {
                    resolve()
                })
           } 
        })
    },
    getCartProducts:(userId)=>
    {
        return new Promise (async(resolve,reject)=>
        {
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
            
                
                    {
                        $match:{user:new objectId(userId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:
                        {
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    } ,
                    {
                        $lookup:
                        {
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },
                    {
                        $project:
                        {
                            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
                        }
                    }
                   
                ]
            ).toArray()
            //   console.log(cartItems[0].products);
              resolve(cartItems)
        })
    },
    getCartCount:(userId)=>
    {
        return new Promise(async(resolve,reject)=>
        {
            let cartCount=0;
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            if (cart)
            {
                cartCount=cart.products.length
            }
            resolve(cartCount)
        })
    },
    changeProductQuantity:(details)=>
    {
        // console.log(details.count);
        details.count=parseInt(details.count);
        details.quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>
        {
            if(details.count==-1 && details.quantity==1)
            {
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart)},
                {
                    $pull:{products:{item:new objectId(details.product)}}
                }).then((responce)=>
                {
                    resolve({removeProduct:true})
                })
            }
            else
            {
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart),"products.item":new objectId(details.product)},
                {
                    $inc:{'products.$.quantity':details.count}
                }).then((response)=>
                {
                    resolve({status:true})
                })
            }
        })
    },
    delProduct:(details)=>
    {
        return new Promise((resolve,reject)=>
        {
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:new objectId(details.cart),"products.item":new objectId(details.product)},
                {
                    $pull:{products:{item:new objectId(details.product)}}
                }).then((responce)=>
                {
                    resolve(true)
                })
        })
    },
    getTotalAmount:(userId)=>
    {
        // console.log("@@@@"+userId);
        return new Promise (async(resolve,reject)=>
        {
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
            
                
                    {
                        $match:{user:new objectId(userId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:
                        {
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    } ,
                    {
                        $lookup:
                        {
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },
                    {
                        $project:
                        {
                            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
                        }
                    },
                    {
                        $group:
                        {
                            _id:null,
                            total:{$sum:{$multiply:[{$toInt:'$quantity'},{$toInt:'$product.price'}]}}
                        }
                    }
                   
                ]
            ).toArray()
                // console.log(total[0].total);
                if(total[0]){
                    resolve(total[0].total);
               } else {
                    resolve([]);
               }
                // resolve(total[0].total);
        })
    },
    placeOrder:(order,product,amnt)=>
    {
        return new Promise((resolve,reject)=>
        {
            console.log(order.paymentMethod);
            let status=order.paymentMethod==='cod'?'placed':'pending';
            let orders=
            {
                deliveryDetails:
                {
                    adress:order.address,
                    mobile:order.mobile,
                    pincode:order.pincode
                },
                userId:new objectId(order.user),
                paymentMethod:order.paymentMethod,
                products:product,
                totalAmnt:amnt,
                status:status,
                date:new Date()
            }
            // console.log(orders.userId+" this is place order");
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orders).then((response)=>
            {

                // db.get().collection(collection.CART_COLLECTION).deleteOne({user:new objectId(orders.userId)})
                resolve(response.insertedId)
            })
            // console.log(order,product,amnt);
        })
    },
    getCartProductList:(userId)=>
    {
        return new Promise(async (resolve,reject)=>
        {
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new objectId(userId)})
            // console.log(cart.products) 
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>
    {
        return new Promise(async(resolve,reject)=>
        {
            // console.log("this is get vorders"+userId);
            // console.log("this is ordr usrid"+await db.get().collection(collection.ORDER_COLLECTION).find({userId: userId}).toArray());
            // let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
  
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({userId: new ObjectId(userId)}).toArray();
            // console.log("Orders for User Id", userId, ":", orders);


            // console.log(orders);
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>
    {
        return new Promise (async(resolve,reject)=>
        {
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            
                
                    {
                        $match:{_id:new objectId(orderId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:
                        {
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    } ,
                    {
                        $lookup:
                        {
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },
                    {
                        $project:
                        {
                            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
                        }
                    }
                   
                ]
            ).toArray()
            //   console.log(cartItems[0].products);
            // console.log(orderItems);
              resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>
    {
        return new Promise ((resolve,reject)=>
        {
            instance.orders.create({
                amount: total*100,
                currency: "INR",
                receipt: ""+orderId,
                notes: {
                  key1: "value3",
                  key2: "value2"
                }
              }).then((order) => {
                console.log("Order created successfully:", order);
                resolve(order);
                
              }).catch((error) => {
                reject(error);
                console.log("Error creating order:", error);
              });
        })
    },
    verifyPayment:(order)=>
    {
        return new Promise ((resolve,reject)=>
        {
            // console.log(order['payment[razorpay_order_id]']+' this is vrfy pymnt');
            
            
            var hmac = crypto.createHmac('sha256','b67TY1nAk93eWHE8cpoluM14');
            hmac.update(order['payment[razorpay_order_id]'] + "|" + order['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            let razorpay_signature=order['payment[razorpay_signature]']
            if (hmac == razorpay_signature) {
                console.log('payment is successful')
                resolve()
            }
            else
            {
                console.log('failed');
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>
    {
        console.log(orderId+"this is order id");
        return new Promise ((resolve,reject)=>
        {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new objectId(orderId)},
            {
                $set:
                {
                    status:'placed'
                }
            }).then(()=>
                {
                    resolve()
                })
        })
    },
    
  
  
    forgetPassword:(email,res)=>
    {
        return new Promise(async(resolve,reject)=>
        {
            const user=await db.get().collection(collection.USER_COLLECTION).findOne({email:email})
        
    
            if (!user) {
          
            res.render('user/forgot-password', { error: 'Email address not found' });
            console.log("user noot found");
            return;

            } else {
                console.log("user found");
            // Generate a unique token for the password reset link
            const token = crypto.randomBytes(20).toString('hex');
            console.log(token);
            // Store the token and the expiration time in the database
            const resetToken = {
                email: email,
                token: token,
                expires: Date.now() + 3600000 // Token expires in 1 hour
            }

            db.get().collection(collection.PASSWORD_RESET).insertOne(resetToken)
               

                // Send an email with the password reset link
                const resetLink = `http://localhost:3000/reset?token=${token}`;
               

                const mailOptions = {
                    from: 'y29186135@gmail.com',
                    to: 'y29186135@gmail.com',
                    subject: 'Password Reset',
                    text: 'Hello world?', // plain text body
                    html: `Click <a href="${resetLink}">here</a> to reset your password`
                  };
              
                // console.log("ex");

                            transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        return console.log(error+"thiere is an error");
                                    }else
                                    console.log('Message sent: %s', info.messageId);
                                })
              
      
                  // Show a success message
                  res.render('user/forgot-password', { success: 'An email has been sent with instructions for resetting your password' });
                // });
              
            }
            resolve()
        })
       
    },
    chekToken:(token)=>
    {
        return new Promise (async(resolve,reject)=>
        {
            try {
                const user = await db.get().collection(collection.PASSWORD_RESET).findOne({ token: token });
                if (!user) {
                    reject('Token not found'); // token not found
                }
                const tokenExpiry = new Date(user.expires);
                const now = new Date();
                if (now > tokenExpiry) {
                    reject('Token expired'); // token expired
                }
                resolve({ email: user.email, token: user.resetToken });
              } catch (error) {
                reject(error);
              }
        })
    },
    resetPassword: (data) => {
        return new Promise(async (resolve, reject) => {
          const email = data.email;
          const token = data.token;
          const password = await bcrypt.hash(data.password, 10);
          console.log("this is pass " + password);
          const resetToken = await db.get()
            .collection(collection.PASSWORD_RESET)
            .findOne({ email: email, token: token, expires: { $gt: Date.now() } });
      
          if (!resetToken) {
            // If the token is invalid or has expired, reject the promise with an error message
            reject('Invalid or expired reset link');
          } else {
            // Update the user's password in the database
            await db.get().collection(collection.USER_COLLECTION)
              .updateOne({ email: email }, { $set: { password: password } });
      
            // Delete the token from the database
            await db.get().collection(collection.PASSWORD_RESET)
              .deleteOne({ email: email, token: token });
      
            // Resolve the promise with a success message
            resolve('Your password has been reset successfully');
          }
        });
      }
      
}   