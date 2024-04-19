
// Imports
constcds=require("@sap/cds");

/**
   * The service implementation with all service handlers
   */
module.exports=cds.service.impl(async function(){
  
    // Define constants for the Risk and BusinessPartner entities from the risk-service.cds file
    const { Risks, BusinessPartners ,Books} = this.entities;

    // This handler will be executed directly AFTER a READ operation on RISKS
    // With this we can loop through the received data set and manipulate the single risk entries
    this.after("READ", Risks, (data) => {
        // Convert to array, if it's only a single risk, so that the code won't break here
        const risks = Array.isArray(data) ? data : [data];

        // Looping through the array of risks to set the virtual field 'criticality' that you defined in the schema
        risks.forEach((risk) => {
            if( risk.impact >= 100000) {
                risk.criticality = 1;
            } else {
                risk.criticality = 2;
            }

            // set criticality for priority
            switch (risk.prio_code) {
                case 'H':
                    risk.PrioCriticality = 1;
                    break;
                case 'M':
                    risk.PrioCriticality = 2;
                    break;
                case 'L':
                    risk.PrioCriticality = 3;
                    break;
                default:
                    break;
            }

        })
    })
// custom error handler : 

  this.on("error",(err,req)=>{
    switch(err.message){
      case"UNIQUE_CONSTRAINT_VIOLATION":
        err.message="The entry already exists.";
        break;

      default:
        err.message=
          "An error occured. Please retry. Technical error message: "+
          err.message;
      break;
    }
  });

  
this.on("submitOrder",async(req)=>{
    // desctuctor :
    const{ book, amount }= req.data;
    let{ stock } = await db.read(Books,book,(b)=>b.stock);
    if(stock >= amount){
      await db.update(Books,book).with({stock: (stock-= amount)});
      await this.emit("OrderedBook",{ book, amount,buyer: req.user.id});
      return req.reply({ stock });// <-- Normal reply
    }else{
      // Reply with error code 409 and a custom error message
      return req.error(409,`${amount} exceeds stock for book #${book}`);
    }
  });
    // connect to remote service
    const BPsrv = await cds.connect.to("API_BUSINESS_PARTNER");

    /**
     * Event-handler for read-events on the BusinessPartners entity.
     * Each request to the API Business Hub requires the apikey in the header.
     */
    this.on("READ", BusinessPartners, async (req) => {
        // The API Sandbox returns alot of business partners with empty names.
        // We don't want them in our application
        req.query.where("LastName <> '' and FirstName <> '' ");

        return await BPsrv.transaction(req).send({
            query: req.query,
            headers: {
                apikey: process.env.apikey,
            },
        });
    });

}); 
