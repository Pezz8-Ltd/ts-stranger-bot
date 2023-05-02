import ClassLogger from "../../logging/Logger";
import mongoose from "mongoose";

/* ==== PROPERTIES ============================================================================== */
const logger: ClassLogger  = new ClassLogger(null as any, __filename);
const mongoDbAddress: string = (process.env.PROD ? process.env.PROD_MONGO_ADDRESS : process.env.TEST_MONGO_ADDRESS) as string

/* ==== CONNECTOR =============================================================================== */
export let stateless: boolean = true;
logger.info(`Trying to connect to ${mongoDbAddress}...`);

// Start MongoDB connector to dockerized instance
mongoose.connect(mongoDbAddress,
    {
        // Connection options
        // useUnifiedTopology: true,
        // useNewUrlParser: true,
        // useCreateIndex: true,
        // useFindAndModify: false
    })
    .then( () => {
        stateless = false;
        logger.info(`Connection to ${mongoDbAddress} established`);
    })
    .catch( e => {
        logger.error(e.message)
        logger.warn("Database connection failed, stateful features disabled");
    } );

export default mongoose;