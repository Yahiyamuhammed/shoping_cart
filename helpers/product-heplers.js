var db=require('../config/connection')
var collection=require('../config/collection');
const { resolve } = require('promise');
var objectId=require('mongodb').ObjectId;
var bcrypt=require('bcrypt');
module.exports={
    addProduct:(product,callback)=>
    {
        console.log(product);
        db.get().collection('product').insertOne(product).then((data)=>
        {
            console.log(data.insertedId);
            callback(data.insertedId)
        })
    },
    getAllProducts:()=>
    {
        return new Promise(async(resolve,reject)=>
        {
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(proId)=>
    {
        return new Promise((resolve,reject)=>
        { 
            console.log(proId);
            console.log(objectId(proId));
         db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:new objectId(proId)}).then((response)=>
         {
              console.log(response);
                resolve(response)
         })
        })
    },
    getProductDetails:(proId)=>
    {
        return new Promise((resolve,reject)=>
        {
           
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:new objectId(proId)}).then((product)=>
            {
                // console.log(product+"  this is get details");
                resolve(product)
            })
        })
    },
    updateProduct:(proId,prodetails)=>
    {
        return new Promise((resolve,reject)=>
        {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:new objectId(proId)},
            {
                $set:
                {
                    Name:prodetails.Name,
                    Category:prodetails.Category,
                    price:prodetails.price,
                    Description:prodetails.Description
                }
            }).then((response)=>
            {
                resolve()
            })
        })
    },
    doLogin:(userData)=>
    {
        return new Promise(async(resolve,reject)=>
        {
            let loginstatus=false;
            let response={};
            let user=await db.get().collection(collection.ADMIN_COLLECTION).findOne({name:userData.name});
            // console.log(user);
            if(user)
            {
                bcrypt.compare(userData.password,user.password).then((status)=>
                {
                    if(status)
                    {
                        console.log("login success");
                        response.admin=user;
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
    // getOrders:()=>
    // {
    //     return new Promise ((resolve,reject)=>
    //     {
    //         let orders=db.get().collection(collection.ORDER_COLLECTION).find().toArray()
    //         // let cusDetails=db.get().collection(collection.USER_COLLECTION).find().toArray()
    //         resolve(orders)
    //     })
        
    // }
    getOrders: () => {
        return new Promise((resolve, reject) => 
        {
          let orders=db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
              $lookup: {
                from: collection.USER_COLLECTION,
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            {
              $unwind: "$user"
            }
          ]).toArray()
            resolve(orders)
        })
      },
    //   getOrderProductDetails:(orderId)=>
    //   {
    //     return new Promise ((resolve,reject)=>
    //     {
    //         console.log(orderId+" this is order id");
    //         let products=db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: new objectId(orderId) }).then((response)=>
    //         {
    //             // console.log(`Order details: ${JSON.stringify(response.products)}`);
    //             resolve(response.products)
    //         })
            
    //     })
    //   },
      getOrderDetail:(id)=>
      {
        return new Promise((resolve, reject) => 
        {
            let odr=db.get().collection(collection.ORDER_COLLECTION).find({_id:new objectId(id)}).toArray()
            console.log(JSON.stringify(odr)+"thids is pr");
            resolve(odr)
        })
      },
      getOrderProductDetails: (orderId) => {
        return new Promise(async(resolve, reject) => {
            console.log('ececeee');
          await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
              $match: { _id: new objectId(orderId) },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "products.item",
                foreignField: "_id",
                as: "product_details",
              },
            },
            {
              $project: {
                _id: 1,
                status: 1,
                paymentMethod: 1,
                products: 1,
                totalAmnt: 1,
                deliveryDetails: 1,
                userId: 1,
                date: 1,
                product_details: {
                  Name: 1,
                  price: 1,
                },
              },
            },
          ]).toArray()
          .then((order) => {
            resolve(order[0]);
          })
          .catch((err) => {
            reject(err);
          });
        });
      },
      
    changePaymentStatus:(orderId,status)=>
    {
        console.log(orderId+"this is order id");
        return new Promise ((resolve,reject)=>
        {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new objectId(orderId)},
            {
                $set:
                {
                    status:status
                }
            }).then(()=>
                {
                    resolve()
                })
        })
    },

    getUsers:()=>
    {
      return new Promise ((resolve,reject)=>
      {
        let users=db.get().collection(collection.USER_COLLECTION).find().toArray()
        // let usr=JSON.stringify(users);

        resolve(users)
      })
    },
    getUserOrder:(id)=>
    {
      return new Promise (async(resolve,reject)=>
      {
        console.log(id);
        let user=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
          {
            $match: {
              userId:new objectId(id)
            }
          },
          {
            $lookup: {
              from: collection.USER_COLLECTION,
              localField: "userId",
              foreignField: "_id",
              as: "user"
            }
          },
          {
            $unwind: "$user"
          }
        ]).toArray()
          resolve(user)
      })
      //   let usr=JSON.stringify(user);
      //   console.log(usr);
      //   resolve(user)
      // })
    }

}